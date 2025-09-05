from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date
from app import db
from app.models.users import User
from app.models.clients import Client
from app.models.invoices import Invoice, InvoiceLineItem
from app.models.services import Service
from app.models.exchange_rates import ExchangeRate
from app.models.audit_log import AuditLog
from app.utils.pdf_generator import generate_invoice_pdf
from app.utils.email_sender import send_invoice_email
import os

invoices_bp = Blueprint('invoices', __name__)

@invoices_bp.route('/')
@jwt_required()
def list_invoices():
    """List all invoices."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status', '')
    client_id = request.args.get('client_id', type=int)
    
    query = Invoice.query
    
    # Filter based on user role
    if user.is_client_manager:
        client_ids = [c.id for c in user.managed_clients]
        query = query.filter(Invoice.client_id.in_(client_ids))
    
    # Apply filters
    if status:
        query = query.filter_by(status=status)
    if client_id:
        query = query.filter_by(client_id=client_id)
    
    invoices = query.order_by(Invoice.created_at.desc())\
        .paginate(page=page, per_page=20, error_out=False)
    
    # Get clients for filter dropdown
    clients_query = Client.query.filter_by(is_active=True)
    if user.is_client_manager:
        clients_query = user.managed_clients.filter_by(is_active=True)
    clients = clients_query.all()
    
    if request.is_json:
        return jsonify({
            'invoices': [inv.to_dict() for inv in invoices.items],
            'total': invoices.total,
            'pages': invoices.pages,
            'current_page': page
        })
    
    return render_template('invoices/list.html', 
                         invoices=invoices, 
                         clients=clients,
                         status=status, 
                         selected_client_id=client_id)

@invoices_bp.route('/create', methods=['GET', 'POST'])
@jwt_required()
def create_invoice():
    """Create new invoice."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not (user.is_super_admin or user.is_client_manager):
        if request.is_json:
            return jsonify({'error': 'Insufficient permissions'}), 403
        flash('Insufficient permissions', 'error')
        return redirect(url_for('invoices.list_invoices'))
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        
        try:
            # Get client
            client = Client.query.get(data.get('client_id'))
            if not client:
                raise ValueError('Client not found')
            
            # Check if user can create invoice for this client
            if user.is_client_manager and client.manager_id != user_id:
                raise ValueError('Cannot create invoice for this client')
            
            # Create invoice
            invoice = Invoice(
                client_id=client.id,
                creator_id=user_id,
                invoice_date=datetime.strptime(data.get('invoice_date'), '%Y-%m-%d').date() if data.get('invoice_date') else date.today(),
                currency=data.get('currency', client.currency_preference),
                gst_applicable=data.get('gst_applicable', 'true').lower() == 'true',
                notes=data.get('notes', '')
            )
            
            # Generate invoice number
            invoice.generate_invoice_number()
            
            # Set due date based on client payment terms
            if not invoice.due_date:
                from datetime import timedelta
                invoice.due_date = invoice.invoice_date + timedelta(days=client.payment_terms)
            
            db.session.add(invoice)
            db.session.flush()  # Get invoice ID
            
            # Add line items
            line_items = data.get('line_items', [])
            if isinstance(line_items, str):
                import json
                line_items = json.loads(line_items)
            
            for item_data in line_items:
                line_item = InvoiceLineItem(
                    invoice_id=invoice.id,
                    service_id=item_data.get('service_id'),
                    description=item_data.get('description'),
                    quantity=float(item_data.get('quantity', 1)),
                    unit=item_data.get('unit', 'hour'),
                    usd_rate=float(item_data.get('usd_rate', 0)) if item_data.get('usd_rate') else None,
                    inr_rate=float(item_data.get('inr_rate', 0)) if item_data.get('inr_rate') else None
                )
                
                # Calculate amounts
                line_item.calculate_amounts()
                db.session.add(line_item)
            
            # Get exchange rate if needed
            if invoice.currency == 'INR' and any(item.usd_rate for item in invoice.line_items):
                exchange_rate = ExchangeRate.get_latest_rate()
                if exchange_rate:
                    invoice.exchange_rate = exchange_rate.rate
                    invoice.exchange_rate_date = exchange_rate.rate_date
            
            # Calculate totals
            invoice.calculate_totals()
            
            db.session.commit()
            
            # Log creation
            AuditLog.log_action(
                user_id=user_id,
                action='create',
                resource_type='invoice',
                resource_id=invoice.id,
                new_values=invoice.to_dict()
            )
            
            if request.is_json:
                return jsonify({'message': 'Invoice created successfully', 'invoice': invoice.to_dict()}), 201
            
            flash('Invoice created successfully', 'success')
            return redirect(url_for('invoices.view_invoice', invoice_id=invoice.id))
            
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'error': f'Failed to create invoice: {str(e)}'}), 400
            flash(f'Failed to create invoice: {str(e)}', 'error')
    
    # Get clients and services for form
    clients_query = Client.query.filter_by(is_active=True)
    if user.is_client_manager:
        clients_query = user.managed_clients.filter_by(is_active=True)
    clients = clients_query.all()
    
    services = Service.query.filter_by(is_active=True).all()
    
    return render_template('invoices/create.html', clients=clients, services=services)

@invoices_bp.route('/<int:invoice_id>')
@jwt_required()
def view_invoice(invoice_id):
    """View invoice details."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    invoice = Invoice.query.get_or_404(invoice_id)
    
    # Check access permissions
    if user.is_client_manager and invoice.client.manager_id != user_id:
        if request.is_json:
            return jsonify({'error': 'Access denied'}), 403
        flash('Access denied', 'error')
        return redirect(url_for('invoices.list_invoices'))
    
    # Log access
    AuditLog.log_action(
        user_id=user_id,
        action='read',
        resource_type='invoice',
        resource_id=invoice_id
    )
    
    if request.is_json:
        invoice_data = invoice.to_dict()
        invoice_data['line_items'] = [item.to_dict() for item in invoice.line_items]
        return jsonify({'invoice': invoice_data})
    
    return render_template('invoices/view.html', invoice=invoice)

@invoices_bp.route('/<int:invoice_id>/edit', methods=['GET', 'POST'])
@jwt_required()
def edit_invoice(invoice_id):
    """Edit invoice (only if in Draft status)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    invoice = Invoice.query.get_or_404(invoice_id)
    
    # Check permissions
    if not (user.is_super_admin or (user.is_client_manager and invoice.client.manager_id == user_id)):
        if request.is_json:
            return jsonify({'error': 'Insufficient permissions'}), 403
        flash('Insufficient permissions', 'error')
        return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))
    
    # Can only edit draft invoices
    if invoice.status != 'Draft':
        if request.is_json:
            return jsonify({'error': 'Can only edit draft invoices'}), 400
        flash('Can only edit draft invoices', 'error')
        return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        
        # Store old values for audit log
        old_values = invoice.to_dict()
        
        try:
            # Update invoice fields
            invoice.invoice_date = datetime.strptime(data.get('invoice_date'), '%Y-%m-%d').date() if data.get('invoice_date') else invoice.invoice_date
            invoice.currency = data.get('currency', invoice.currency)
            invoice.gst_applicable = data.get('gst_applicable', 'true').lower() == 'true'
            invoice.notes = data.get('notes', invoice.notes)
            
            # Clear existing line items
            for item in invoice.line_items:
                db.session.delete(item)
            
            # Add new line items
            line_items = data.get('line_items', [])
            if isinstance(line_items, str):
                import json
                line_items = json.loads(line_items)
            
            for item_data in line_items:
                line_item = InvoiceLineItem(
                    invoice_id=invoice.id,
                    service_id=item_data.get('service_id'),
                    description=item_data.get('description'),
                    quantity=float(item_data.get('quantity', 1)),
                    unit=item_data.get('unit', 'hour'),
                    usd_rate=float(item_data.get('usd_rate', 0)) if item_data.get('usd_rate') else None,
                    inr_rate=float(item_data.get('inr_rate', 0)) if item_data.get('inr_rate') else None
                )
                
                line_item.calculate_amounts()
                db.session.add(line_item)
            
            # Recalculate totals
            invoice.calculate_totals()
            
            db.session.commit()
            
            # Log update
            AuditLog.log_action(
                user_id=user_id,
                action='update',
                resource_type='invoice',
                resource_id=invoice_id,
                old_values=old_values,
                new_values=invoice.to_dict()
            )
            
            if request.is_json:
                return jsonify({'message': 'Invoice updated successfully', 'invoice': invoice.to_dict()})
            
            flash('Invoice updated successfully', 'success')
            return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))
            
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'error': f'Failed to update invoice: {str(e)}'}), 400
            flash(f'Failed to update invoice: {str(e)}', 'error')
    
    # Get services for form
    services = Service.query.filter_by(is_active=True).all()
    
    return render_template('invoices/edit.html', invoice=invoice, services=services)

@invoices_bp.route('/<int:invoice_id>/approve', methods=['POST'])
@jwt_required()
def approve_invoice(invoice_id):
    """Approve invoice (Draft -> Approved)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    invoice = Invoice.query.get_or_404(invoice_id)
    
    # Check permissions
    if not (user.is_super_admin or (user.is_client_manager and invoice.client.manager_id == user_id)):
        if request.is_json:
            return jsonify({'error': 'Insufficient permissions'}), 403
        flash('Insufficient permissions', 'error')
        return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))
    
    if invoice.status != 'Draft':
        if request.is_json:
            return jsonify({'error': 'Can only approve draft invoices'}), 400
        flash('Can only approve draft invoices', 'error')
        return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))
    
    try:
        invoice.status = 'Approved'
        db.session.commit()
        
        # Log approval
        AuditLog.log_action(
            user_id=user_id,
            action='update',
            resource_type='invoice',
            resource_id=invoice_id,
            old_values={'status': 'Draft'},
            new_values={'status': 'Approved'}
        )
        
        if request.is_json:
            return jsonify({'message': 'Invoice approved successfully'})
        
        flash('Invoice approved successfully', 'success')
        
    except Exception as e:
        db.session.rollback()
        if request.is_json:
            return jsonify({'error': f'Failed to approve invoice: {str(e)}'}), 400
        flash(f'Failed to approve invoice: {str(e)}', 'error')
    
    return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))

@invoices_bp.route('/<int:invoice_id>/finalize', methods=['POST'])
@jwt_required()
def finalize_invoice(invoice_id):
    """Finalize invoice (Approved -> Finalized)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    invoice = Invoice.query.get_or_404(invoice_id)
    
    # Only super admin can finalize
    if not user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Only super admin can finalize invoices'}), 403
        flash('Only super admin can finalize invoices', 'error')
        return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))
    
    if invoice.status != 'Approved':
        if request.is_json:
            return jsonify({'error': 'Can only finalize approved invoices'}), 400
        flash('Can only finalize approved invoices', 'error')
        return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))
    
    try:
        # Freeze exchange rate
        if not invoice.exchange_rate and invoice.currency == 'INR':
            exchange_rate = ExchangeRate.get_latest_rate()
            if exchange_rate:
                invoice.exchange_rate = exchange_rate.rate
                invoice.exchange_rate_date = exchange_rate.rate_date
        
        invoice.status = 'Finalized'
        invoice.finalized_at = datetime.utcnow()
        
        # Generate PDF
        pdf_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], str(invoice.client_id), 'invoices')
        os.makedirs(pdf_dir, exist_ok=True)
        
        pdf_filename = f"Invoice_{invoice.invoice_number}.pdf"
        pdf_path = os.path.join(pdf_dir, pdf_filename)
        
        generate_invoice_pdf(invoice, pdf_path)
        invoice.pdf_path = pdf_path
        
        db.session.commit()
        
        # Log finalization
        AuditLog.log_action(
            user_id=user_id,
            action='update',
            resource_type='invoice',
            resource_id=invoice_id,
            old_values={'status': 'Approved'},
            new_values={'status': 'Finalized', 'pdf_generated': True}
        )
        
        if request.is_json:
            return jsonify({'message': 'Invoice finalized and PDF generated successfully'})
        
        flash('Invoice finalized and PDF generated successfully', 'success')
        
    except Exception as e:
        db.session.rollback()
        if request.is_json:
            return jsonify({'error': f'Failed to finalize invoice: {str(e)}'}), 400
        flash(f'Failed to finalize invoice: {str(e)}', 'error')
    
    return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))

@invoices_bp.route('/<int:invoice_id>/send', methods=['POST'])
@jwt_required()
def send_invoice(invoice_id):
    """Send invoice via email."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    invoice = Invoice.query.get_or_404(invoice_id)
    
    # Check permissions
    if not (user.is_super_admin or (user.is_client_manager and invoice.client.manager_id == user_id)):
        if request.is_json:
            return jsonify({'error': 'Insufficient permissions'}), 403
        flash('Insufficient permissions', 'error')
        return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))
    
    if invoice.status != 'Finalized':
        if request.is_json:
            return jsonify({'error': 'Can only send finalized invoices'}), 400
        flash('Can only send finalized invoices', 'error')
        return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))
    
    try:
        # Send email
        success, message = send_invoice_email(invoice)
        
        if success:
            invoice.status = 'Sent'
            invoice.email_sent = True
            invoice.email_sent_date = datetime.utcnow()
            db.session.commit()
            
            # Log email send
            AuditLog.log_action(
                user_id=user_id,
                action='email_sent',
                resource_type='invoice',
                resource_id=invoice_id,
                new_values={'email_sent_to': invoice.client.email}
            )
            
            if request.is_json:
                return jsonify({'message': 'Invoice sent successfully'})
            flash('Invoice sent successfully', 'success')
        else:
            if request.is_json:
                return jsonify({'error': message}), 400
            flash(message, 'error')
        
    except Exception as e:
        if request.is_json:
            return jsonify({'error': f'Failed to send invoice: {str(e)}'}), 400
        flash(f'Failed to send invoice: {str(e)}', 'error')
    
    return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))

@invoices_bp.route('/<int:invoice_id>/download')
@jwt_required()
def download_invoice(invoice_id):
    """Download invoice PDF."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    invoice = Invoice.query.get_or_404(invoice_id)
    
    # Check access permissions
    if user.is_client_manager and invoice.client.manager_id != user_id:
        flash('Access denied', 'error')
        return redirect(url_for('invoices.list_invoices'))
    
    if not invoice.pdf_path or not os.path.exists(invoice.pdf_path):
        flash('PDF not available', 'error')
        return redirect(url_for('invoices.view_invoice', invoice_id=invoice_id))
    
    # Log download
    AuditLog.log_action(
        user_id=user_id,
        action='download',
        resource_type='invoice',
        resource_id=invoice_id
    )
    
    return send_file(
        invoice.pdf_path,
        as_attachment=True,
        download_name=f"Invoice_{invoice.invoice_number}.pdf",
        mimetype='application/pdf'
    )