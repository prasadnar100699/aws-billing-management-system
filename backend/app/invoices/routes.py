from flask import request, jsonify, current_app, send_file
from flask_login import login_required, current_user
from app.invoices import bp
from app.models import Invoice, InvoiceLineItem, InvoiceAttachment, InvoiceTemplate, Client, PricingComponent
from app import db
from app.utils.auth import require_permission
from app.utils.audit import log_user_action
from app.tasks.pdf_generator import generate_invoice_pdf
from app.tasks.email_sender import send_invoice_email
from sqlalchemy import or_, and_
from datetime import datetime, timedelta
import os

@bp.route('/', methods=['POST'])
@login_required
@require_permission('Invoices', 'create')
def create_invoice():
    """Create a new invoice"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('client_id'):
            return jsonify({'error': 'client_id is required'}), 400
        
        # Validate client exists and user has access
        client = Client.query.get(data['client_id'])
        if not client:
            return jsonify({'error': 'Client not found'}), 404
        
        # Check if Client Manager has access to this client
        if current_user.role.role_name == 'Client Manager':
            if current_user not in client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        # Create invoice
        invoice = Invoice(
            client_id=data['client_id'],
            invoice_date=datetime.fromisoformat(data['invoice_date']) if data.get('invoice_date') else datetime.utcnow(),
            due_date=datetime.fromisoformat(data['due_date']) if data.get('due_date') else None,
            usd_to_inr_rate=data.get('usd_to_inr_rate'),
            gst_applicable=data.get('gst_applicable', client.gst_registered),
            invoice_notes=data.get('invoice_notes'),
            status=data.get('status', 'draft')
        )
        
        # Generate invoice number
        invoice.generate_invoice_number()
        
        db.session.add(invoice)
        db.session.flush()  # Get the invoice_id
        
        # Add line items
        line_items = data.get('line_items', [])
        for item_data in line_items:
            line_item = InvoiceLineItem(
                invoice_id=invoice.invoice_id,
                component_id=item_data.get('component_id'),
                description=item_data['description'],
                quantity=item_data['quantity'],
                rate=item_data['rate'],
                discount=item_data.get('discount', 0),
                currency=item_data.get('currency', client.default_currency.value)
            )
            db.session.add(line_item)
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'create_invoice', 
                       f"Created invoice: {invoice.invoice_number}")
        
        return jsonify({
            'message': 'Invoice created successfully',
            'invoice': invoice.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create invoice error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/', methods=['GET'])
@login_required
@require_permission('Invoices', 'view')
def list_invoices():
    """List invoices with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        sort = request.args.get('sort', 'invoice_date')
        search = request.args.get('search', '')
        status = request.args.get('status')
        client_id = request.args.get('client_id', type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Build query
        query = Invoice.query
        
        # For Client Managers, only show invoices for assigned clients
        if current_user.role.role_name == 'Client Manager':
            assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
            query = query.filter(Invoice.client_id.in_(assigned_client_ids))
        
        # Apply search filter
        if search:
            query = query.join(Client).filter(or_(
                Invoice.invoice_number.contains(search),
                Client.client_name.contains(search),
                Invoice.invoice_notes.contains(search)
            ))
        
        # Apply status filter
        if status:
            query = query.filter(Invoice.status == status)
        
        # Apply client filter
        if client_id:
            query = query.filter(Invoice.client_id == client_id)
        
        # Apply date filters
        if date_from:
            query = query.filter(Invoice.invoice_date >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(Invoice.invoice_date <= datetime.fromisoformat(date_to))
        
        # Apply sorting
        if sort == 'invoice_date':
            query = query.order_by(Invoice.invoice_date.desc())
        elif sort == 'due_date':
            query = query.order_by(Invoice.due_date.desc())
        elif sort == 'client_name':
            query = query.join(Client).order_by(Client.client_name)
        elif sort == 'status':
            query = query.order_by(Invoice.status)
        else:
            query = query.order_by(Invoice.invoice_date.desc())
        
        # Paginate results
        invoices = query.paginate(page=page, per_page=limit, error_out=False)
        
        return jsonify({
            'invoices': [invoice.to_dict() for invoice in invoices.items],
            'total': invoices.total,
            'pages': invoices.pages,
            'current_page': page,
            'per_page': limit
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List invoices error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:invoice_id>', methods=['GET'])
@login_required
@require_permission('Invoices', 'view')
def get_invoice(invoice_id):
    """Get invoice details"""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        
        # Check if Client Manager has access to this invoice
        if current_user.role.role_name == 'Client Manager':
            if current_user not in invoice.client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'invoice': invoice.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get invoice error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:invoice_id>', methods=['PUT'])
@login_required
@require_permission('Invoices', 'edit')
def update_invoice(invoice_id):
    """Update invoice (only if not finalized)"""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        
        # Check if Client Manager has access to this invoice
        if current_user.role.role_name == 'Client Manager':
            if current_user not in invoice.client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        # Check if invoice can be edited
        if invoice.status.value in ['finalized', 'sent']:
            return jsonify({'error': 'Cannot edit finalized or sent invoice'}), 400
        
        data = request.get_json()
        
        # Update basic fields
        if 'invoice_date' in data:
            invoice.invoice_date = datetime.fromisoformat(data['invoice_date'])
        if 'due_date' in data:
            invoice.due_date = datetime.fromisoformat(data['due_date'])
        if 'usd_to_inr_rate' in data:
            invoice.usd_to_inr_rate = data['usd_to_inr_rate']
        if 'gst_applicable' in data:
            invoice.gst_applicable = data['gst_applicable']
        if 'invoice_notes' in data:
            invoice.invoice_notes = data['invoice_notes']
        if 'status' in data:
            invoice.status = data['status']
        
        # Update line items if provided
        if 'line_items' in data:
            # Delete existing line items
            InvoiceLineItem.query.filter_by(invoice_id=invoice_id).delete()
            
            # Add new line items
            for item_data in data['line_items']:
                line_item = InvoiceLineItem(
                    invoice_id=invoice_id,
                    component_id=item_data.get('component_id'),
                    description=item_data['description'],
                    quantity=item_data['quantity'],
                    rate=item_data['rate'],
                    discount=item_data.get('discount', 0),
                    currency=item_data.get('currency', 'USD')
                )
                db.session.add(line_item)
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'update_invoice', 
                       f"Updated invoice: {invoice.invoice_number}")
        
        return jsonify({
            'message': 'Invoice updated successfully',
            'invoice': invoice.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update invoice error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:invoice_id>', methods=['DELETE'])
@login_required
@require_permission('Invoices', 'delete')
def delete_invoice(invoice_id):
    """Delete invoice (only if draft)"""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        
        # Check if Client Manager has access to this invoice
        if current_user.role.role_name == 'Client Manager':
            if current_user not in invoice.client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        # Only allow deletion of draft invoices
        if invoice.status.value != 'draft':
            return jsonify({'error': 'Can only delete draft invoices'}), 400
        
        db.session.delete(invoice)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'delete_invoice', 
                       f"Deleted invoice: {invoice.invoice_number}")
        
        return jsonify({'message': 'Invoice deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete invoice error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:invoice_id>/pdf', methods=['POST'])
@login_required
@require_permission('Invoices', 'edit')
def generate_pdf(invoice_id):
    """Generate PDF for invoice"""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        
        # Check if Client Manager has access to this invoice
        if current_user.role.role_name == 'Client Manager':
            if current_user not in invoice.client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        # Queue PDF generation task
        task = generate_invoice_pdf.delay(invoice_id)
        
        log_user_action(current_user.user_id, 'generate_pdf', 
                       f"Queued PDF generation for invoice: {invoice.invoice_number}")
        
        return jsonify({
            'message': 'PDF generation queued',
            'task_id': task.id
        }), 202
        
    except Exception as e:
        current_app.logger.error(f"Generate PDF error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:invoice_id>/pdf', methods=['GET'])
@login_required
@require_permission('Invoices', 'view')
def download_pdf(invoice_id):
    """Download invoice PDF"""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        
        # Check if Client Manager has access to this invoice
        if current_user.role.role_name == 'Client Manager':
            if current_user not in invoice.client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        if not invoice.pdf_path or not os.path.exists(invoice.pdf_path):
            return jsonify({'error': 'PDF not found'}), 404
        
        return send_file(
            invoice.pdf_path,
            as_attachment=True,
            download_name=f"{invoice.invoice_number}.pdf"
        )
        
    except Exception as e:
        current_app.logger.error(f"Download PDF error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:invoice_id>/send', methods=['POST'])
@login_required
@require_permission('Invoices', 'edit')
def send_invoice(invoice_id):
    """Send invoice via email"""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        
        # Check if Client Manager has access to this invoice
        if current_user.role.role_name == 'Client Manager':
            if current_user not in invoice.client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        # Invoice must be finalized to send
        if invoice.status.value not in ['finalized', 'sent']:
            return jsonify({'error': 'Invoice must be finalized before sending'}), 400
        
        data = request.get_json()
        email_to = data.get('email_to', invoice.client.email)
        email_subject = data.get('email_subject', f'Invoice {invoice.invoice_number}')
        email_body = data.get('email_body', f'Please find attached invoice {invoice.invoice_number}.')
        
        # Queue email sending task
        task = send_invoice_email.delay(
            invoice_id, 
            email_to, 
            email_subject, 
            email_body
        )
        
        # Update invoice status
        invoice.status = 'sent'
        db.session.commit()
        
        log_user_action(current_user.user_id, 'send_invoice', 
                       f"Queued email sending for invoice: {invoice.invoice_number}")
        
        return jsonify({
            'message': 'Invoice email queued',
            'task_id': task.id
        }), 202
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Send invoice error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Invoice Templates
@bp.route('/templates', methods=['POST'])
@login_required
@require_permission('Invoices', 'create')
def create_template():
    """Create recurring invoice template"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['client_id', 'template_name', 'frequency']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate client exists and user has access
        client = Client.query.get(data['client_id'])
        if not client:
            return jsonify({'error': 'Client not found'}), 404
        
        if current_user.role.role_name == 'Client Manager':
            if current_user not in client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        template = InvoiceTemplate(
            client_id=data['client_id'],
            template_name=data['template_name'],
            frequency=data['frequency'],
            is_active=data.get('is_active', True)
        )
        
        if data.get('services'):
            template.set_services(data['services'])
        
        db.session.add(template)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'create_template', 
                       f"Created invoice template: {template.template_name}")
        
        return jsonify({
            'message': 'Invoice template created successfully',
            'template': template.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create template error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/templates', methods=['GET'])
@login_required
@require_permission('Invoices', 'view')
def list_templates():
    """List invoice templates"""
    try:
        query = InvoiceTemplate.query
        
        # For Client Managers, only show templates for assigned clients
        if current_user.role.role_name == 'Client Manager':
            assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
            query = query.filter(InvoiceTemplate.client_id.in_(assigned_client_ids))
        
        templates = query.all()
        
        return jsonify({
            'templates': [template.to_dict() for template in templates]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List templates error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/templates/<int:template_id>', methods=['PUT'])
@login_required
@require_permission('Invoices', 'edit')
def update_template(template_id):
    """Update invoice template"""
    try:
        template = InvoiceTemplate.query.get_or_404(template_id)
        
        # Check if Client Manager has access
        if current_user.role.role_name == 'Client Manager':
            if current_user not in template.client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        if 'template_name' in data:
            template.template_name = data['template_name']
        if 'frequency' in data:
            template.frequency = data['frequency']
        if 'is_active' in data:
            template.is_active = data['is_active']
        if 'services' in data:
            template.set_services(data['services'])
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'update_template', 
                       f"Updated invoice template: {template.template_name}")
        
        return jsonify({
            'message': 'Invoice template updated successfully',
            'template': template.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update template error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/templates/<int:template_id>', methods=['DELETE'])
@login_required
@require_permission('Invoices', 'delete')
def delete_template(template_id):
    """Delete invoice template"""
    try:
        template = InvoiceTemplate.query.get_or_404(template_id)
        
        # Check if Client Manager has access
        if current_user.role.role_name == 'Client Manager':
            if current_user not in template.client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        db.session.delete(template)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'delete_template', 
                       f"Deleted invoice template: {template.template_name}")
        
        return jsonify({'message': 'Invoice template deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete template error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500