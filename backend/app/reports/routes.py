from flask import request, jsonify, current_app, send_file
from flask_login import login_required, current_user
from app.reports import bp
from app.models import Client, Invoice, InvoiceLineItem, Service, PricingComponent
from app import db, redis_client
from app.utils.auth import require_permission
from app.utils.audit import log_user_action
from app.tasks.report_generator import generate_report_export
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
import json
import tempfile
import csv
import io

@bp.route('/clients', methods=['POST'])
@login_required
@require_permission('Reports', 'create')
def generate_client_report():
    """Generate client revenue report"""
    try:
        data = request.get_json()
        
        # Validate date range
        if not data.get('date_range') or not data['date_range'].get('start') or not data['date_range'].get('end'):
            return jsonify({'error': 'Date range is required'}), 400
        
        start_date = datetime.fromisoformat(data['date_range']['start'])
        end_date = datetime.fromisoformat(data['date_range']['end'])
        client_id = data.get('client_id')
        
        # Build query
        query = db.session.query(
            Client.client_id,
            Client.client_name,
            func.count(Invoice.invoice_id).label('total_invoices'),
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('total_revenue'),
            func.avg(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('avg_invoice_amount')
        ).join(Invoice).join(InvoiceLineItem).filter(
            and_(
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date,
                Invoice.status != 'draft'
            )
        )
        
        # For Client Managers, only show assigned clients
        if current_user.role.role_name == 'Client Manager':
            assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
            query = query.filter(Client.client_id.in_(assigned_client_ids))
        
        # Apply client filter if provided
        if client_id:
            query = query.filter(Client.client_id == client_id)
        
        query = query.group_by(Client.client_id, Client.client_name)
        results = query.all()
        
        # Format results
        report_data = []
        for result in results:
            report_data.append({
                'client_id': result.client_id,
                'client_name': result.client_name,
                'total_invoices': result.total_invoices,
                'total_revenue': float(result.total_revenue or 0),
                'avg_invoice_amount': float(result.avg_invoice_amount or 0)
            })
        
        # Cache report
        cache_key = f"client_report_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}_{client_id or 'all'}"
        redis_client.setex(cache_key, 3600, json.dumps(report_data))  # Cache for 1 hour
        
        log_user_action(current_user.user_id, 'generate_client_report', 
                       f"Generated client report for {start_date} to {end_date}")
        
        return jsonify({
            'report_data': report_data,
            'date_range': data['date_range'],
            'generated_at': datetime.utcnow().isoformat(),
            'cache_key': cache_key
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Generate client report error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/clients', methods=['GET'])
@login_required
@require_permission('Reports', 'view')
def list_client_reports():
    """List cached client reports"""
    try:
        # This would typically list cached reports from Redis
        # For now, return empty list
        return jsonify({'reports': []}), 200
        
    except Exception as e:
        current_app.logger.error(f"List client reports error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/services', methods=['POST'])
@login_required
@require_permission('Reports', 'create')
def generate_service_report():
    """Generate service usage report"""
    try:
        data = request.get_json()
        
        # Validate date range
        if not data.get('date_range') or not data['date_range'].get('start') or not data['date_range'].get('end'):
            return jsonify({'error': 'Date range is required'}), 400
        
        start_date = datetime.fromisoformat(data['date_range']['start'])
        end_date = datetime.fromisoformat(data['date_range']['end'])
        service_id = data.get('service_id')
        
        # Build query
        query = db.session.query(
            Service.service_id,
            Service.service_name,
            PricingComponent.component_name,
            func.sum(InvoiceLineItem.quantity).label('total_quantity'),
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('total_revenue'),
            func.count(func.distinct(Invoice.client_id)).label('unique_clients')
        ).join(PricingComponent).join(InvoiceLineItem).join(Invoice).filter(
            and_(
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date,
                Invoice.status != 'draft'
            )
        )
        
        # For Client Managers, only show data for assigned clients
        if current_user.role.role_name == 'Client Manager':
            assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
            query = query.filter(Invoice.client_id.in_(assigned_client_ids))
        
        # Apply service filter if provided
        if service_id:
            query = query.filter(Service.service_id == service_id)
        
        query = query.group_by(Service.service_id, Service.service_name, PricingComponent.component_name)
        results = query.all()
        
        # Format results
        report_data = []
        for result in results:
            report_data.append({
                'service_id': result.service_id,
                'service_name': result.service_name,
                'component_name': result.component_name,
                'total_quantity': float(result.total_quantity or 0),
                'total_revenue': float(result.total_revenue or 0),
                'unique_clients': result.unique_clients
            })
        
        # Cache report
        cache_key = f"service_report_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}_{service_id or 'all'}"
        redis_client.setex(cache_key, 3600, json.dumps(report_data))
        
        log_user_action(current_user.user_id, 'generate_service_report', 
                       f"Generated service report for {start_date} to {end_date}")
        
        return jsonify({
            'report_data': report_data,
            'date_range': data['date_range'],
            'generated_at': datetime.utcnow().isoformat(),
            'cache_key': cache_key
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Generate service report error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/services', methods=['GET'])
@login_required
@require_permission('Reports', 'view')
def list_service_reports():
    """List cached service reports"""
    try:
        return jsonify({'reports': []}), 200
        
    except Exception as e:
        current_app.logger.error(f"List service reports error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/revenue', methods=['POST'])
@login_required
@require_permission('Reports', 'create')
def generate_revenue_report():
    """Generate revenue trend report"""
    try:
        data = request.get_json()
        
        # Validate date range
        if not data.get('date_range') or not data['date_range'].get('start') or not data['date_range'].get('end'):
            return jsonify({'error': 'Date range is required'}), 400
        
        start_date = datetime.fromisoformat(data['date_range']['start'])
        end_date = datetime.fromisoformat(data['date_range']['end'])
        grouping = data.get('grouping', 'monthly')  # monthly, quarterly, yearly
        
        # Determine date grouping
        if grouping == 'monthly':
            date_format = '%Y-%m'
            date_trunc = func.date_format(Invoice.invoice_date, '%Y-%m')
        elif grouping == 'quarterly':
            date_format = '%Y-Q%q'
            date_trunc = func.concat(func.year(Invoice.invoice_date), '-Q', func.quarter(Invoice.invoice_date))
        else:  # yearly
            date_format = '%Y'
            date_trunc = func.year(Invoice.invoice_date)
        
        # Build query
        query = db.session.query(
            date_trunc.label('period'),
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('revenue'),
            func.count(func.distinct(Invoice.invoice_id)).label('invoice_count'),
            func.count(func.distinct(Invoice.client_id)).label('client_count')
        ).join(Invoice).filter(
            and_(
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date,
                Invoice.status != 'draft'
            )
        )
        
        # For Client Managers, only show data for assigned clients
        if current_user.role.role_name == 'Client Manager':
            assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
            query = query.filter(Invoice.client_id.in_(assigned_client_ids))
        
        query = query.group_by(date_trunc).order_by(date_trunc)
        results = query.all()
        
        # Format results for chart
        labels = []
        revenue_data = []
        invoice_counts = []
        client_counts = []
        
        for result in results:
            labels.append(str(result.period))
            revenue_data.append(float(result.revenue or 0))
            invoice_counts.append(result.invoice_count)
            client_counts.append(result.client_count)
        
        report_data = {
            'labels': labels,
            'revenue_data': revenue_data,
            'invoice_counts': invoice_counts,
            'client_counts': client_counts,
            'total_revenue': sum(revenue_data),
            'total_invoices': sum(invoice_counts),
            'avg_revenue_per_period': sum(revenue_data) / len(revenue_data) if revenue_data else 0
        }
        
        # Cache report
        cache_key = f"revenue_report_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}_{grouping}"
        redis_client.setex(cache_key, 3600, json.dumps(report_data))
        
        log_user_action(current_user.user_id, 'generate_revenue_report', 
                       f"Generated revenue report for {start_date} to {end_date}")
        
        return jsonify({
            'report_data': report_data,
            'date_range': data['date_range'],
            'grouping': grouping,
            'generated_at': datetime.utcnow().isoformat(),
            'cache_key': cache_key
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Generate revenue report error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/revenue', methods=['GET'])
@login_required
@require_permission('Reports', 'view')
def list_revenue_reports():
    """List cached revenue reports"""
    try:
        return jsonify({'reports': []}), 200
        
    except Exception as e:
        current_app.logger.error(f"List revenue reports error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/aging', methods=['POST'])
@login_required
@require_permission('Reports', 'create')
def generate_aging_report():
    """Generate invoice aging report"""
    try:
        # Get overdue invoices
        today = datetime.utcnow().date()
        
        query = db.session.query(
            Invoice.invoice_id,
            Invoice.invoice_number,
            Client.client_name,
            Invoice.invoice_date,
            Invoice.due_date,
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('amount'),
            func.datediff(today, Invoice.due_date).label('days_overdue')
        ).join(Client).join(InvoiceLineItem).filter(
            and_(
                Invoice.due_date < today,
                Invoice.status.in_(['finalized', 'sent'])
            )
        )
        
        # For Client Managers, only show invoices for assigned clients
        if current_user.role.role_name == 'Client Manager':
            assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
            query = query.filter(Invoice.client_id.in_(assigned_client_ids))
        
        query = query.group_by(Invoice.invoice_id).order_by(Invoice.due_date)
        results = query.all()
        
        # Categorize by aging buckets
        aging_buckets = {
            '0-30': [],
            '31-60': [],
            '61-90': [],
            '90+': []
        }
        
        for result in results:
            days_overdue = result.days_overdue
            invoice_data = {
                'invoice_id': result.invoice_id,
                'invoice_number': result.invoice_number,
                'client_name': result.client_name,
                'invoice_date': result.invoice_date.isoformat(),
                'due_date': result.due_date.isoformat(),
                'amount': float(result.amount),
                'days_overdue': days_overdue
            }
            
            if days_overdue <= 30:
                aging_buckets['0-30'].append(invoice_data)
            elif days_overdue <= 60:
                aging_buckets['31-60'].append(invoice_data)
            elif days_overdue <= 90:
                aging_buckets['61-90'].append(invoice_data)
            else:
                aging_buckets['90+'].append(invoice_data)
        
        # Calculate totals
        totals = {}
        for bucket, invoices in aging_buckets.items():
            totals[bucket] = {
                'count': len(invoices),
                'amount': sum(inv['amount'] for inv in invoices)
            }
        
        report_data = {
            'aging_buckets': aging_buckets,
            'totals': totals,
            'total_overdue_amount': sum(total['amount'] for total in totals.values()),
            'total_overdue_count': sum(total['count'] for total in totals.values())
        }
        
        log_user_action(current_user.user_id, 'generate_aging_report', 
                       "Generated invoice aging report")
        
        return jsonify({
            'report_data': report_data,
            'generated_at': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Generate aging report error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/export', methods=['POST'])
@login_required
@require_permission('Reports', 'create')
def export_report():
    """Export report in various formats"""
    try:
        data = request.get_json()
        
        report_type = data.get('report_type')  # 'clients', 'services', 'revenue', 'aging'
        export_format = data.get('format', 'csv')  # 'csv', 'excel', 'pdf'
        cache_key = data.get('cache_key')
        
        if not report_type:
            return jsonify({'error': 'report_type is required'}), 400
        
        # Get report data from cache or regenerate
        report_data = None
        if cache_key:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                report_data = json.loads(cached_data)
        
        if not report_data:
            return jsonify({'error': 'Report data not found. Please regenerate the report.'}), 404
        
        # Queue export task
        task = generate_report_export.delay(report_type, export_format, report_data)
        
        log_user_action(current_user.user_id, 'export_report', 
                       f"Queued export for {report_type} report in {export_format} format")
        
        return jsonify({
            'message': 'Report export queued',
            'task_id': task.id
        }), 202
        
    except Exception as e:
        current_app.logger.error(f"Export report error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/gst-compliance', methods=['POST'])
@login_required
@require_permission('Reports', 'create')
def generate_gst_report():
    """Generate GST compliance report"""
    try:
        data = request.get_json()
        
        # Validate date range
        if not data.get('date_range') or not data['date_range'].get('start') or not data['date_range'].get('end'):
            return jsonify({'error': 'Date range is required'}), 400
        
        start_date = datetime.fromisoformat(data['date_range']['start'])
        end_date = datetime.fromisoformat(data['date_range']['end'])
        
        # Get invoices with GST
        query = db.session.query(
            Invoice.invoice_id,
            Invoice.invoice_number,
            Client.client_name,
            Client.gst_number,
            Invoice.invoice_date,
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('taxable_amount'),
            (func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)) * 0.18).label('gst_amount')
        ).join(Client).join(InvoiceLineItem).filter(
            and_(
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date,
                Invoice.gst_applicable == True,
                Invoice.status != 'draft'
            )
        )
        
        # For Client Managers, only show invoices for assigned clients
        if current_user.role.role_name == 'Client Manager':
            assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
            query = query.filter(Invoice.client_id.in_(assigned_client_ids))
        
        query = query.group_by(Invoice.invoice_id).order_by(Invoice.invoice_date)
        results = query.all()
        
        # Format results
        gst_data = []
        total_taxable = 0
        total_gst = 0
        
        for result in results:
            taxable_amount = float(result.taxable_amount)
            gst_amount = float(result.gst_amount)
            
            gst_data.append({
                'invoice_id': result.invoice_id,
                'invoice_number': result.invoice_number,
                'client_name': result.client_name,
                'gst_number': result.gst_number,
                'invoice_date': result.invoice_date.isoformat(),
                'taxable_amount': taxable_amount,
                'gst_amount': gst_amount,
                'total_amount': taxable_amount + gst_amount
            })
            
            total_taxable += taxable_amount
            total_gst += gst_amount
        
        report_data = {
            'gst_invoices': gst_data,
            'summary': {
                'total_invoices': len(gst_data),
                'total_taxable_amount': total_taxable,
                'total_gst_amount': total_gst,
                'total_amount': total_taxable + total_gst
            }
        }
        
        log_user_action(current_user.user_id, 'generate_gst_report', 
                       f"Generated GST report for {start_date} to {end_date}")
        
        return jsonify({
            'report_data': report_data,
            'date_range': data['date_range'],
            'generated_at': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Generate GST report error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500