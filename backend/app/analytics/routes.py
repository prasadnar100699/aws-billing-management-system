from flask import request, jsonify, current_app
from flask_login import login_required, current_user
from app.analytics import bp
from app.models import Client, Invoice, InvoiceLineItem, Service, User, UsageImport
from app import db, redis_client
from app.utils.auth import require_permission
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
import json

@bp.route('/super-admin', methods=['GET'])
@login_required
@require_permission('Analytics', 'view')
def get_super_admin_analytics():
    """Get analytics data for Super Admin dashboard"""
    try:
        # Only Super Admins can access this
        if current_user.role.role_name != 'Super Admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Check cache first
        cache_key = 'analytics_super_admin'
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return jsonify(json.loads(cached_data)), 200
        
        # Calculate date ranges
        today = datetime.utcnow().date()
        this_month_start = today.replace(day=1)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
        last_month_end = this_month_start - timedelta(days=1)
        this_year_start = today.replace(month=1, day=1)
        
        # Basic counts
        total_clients = Client.query.filter_by(status='active').count()
        total_users = User.query.filter_by(status='active').count()
        total_services = Service.query.filter_by(status='active').count()
        
        # AWS accounts count
        aws_accounts = db.session.query(func.count(func.distinct(Client.aws_account_ids))).filter(
            Client.aws_account_ids.isnot(None)
        ).scalar() or 0
        
        # Invoice statistics
        total_invoices = Invoice.query.filter(Invoice.status != 'draft').count()
        
        # Revenue this month
        revenue_this_month = db.session.query(
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100))
        ).join(Invoice).filter(
            and_(
                Invoice.invoice_date >= this_month_start,
                Invoice.status != 'draft'
            )
        ).scalar() or 0
        
        # Revenue last month
        revenue_last_month = db.session.query(
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100))
        ).join(Invoice).filter(
            and_(
                Invoice.invoice_date >= last_month_start,
                Invoice.invoice_date <= last_month_end,
                Invoice.status != 'draft'
            )
        ).scalar() or 0
        
        # Revenue growth
        revenue_growth = 0
        if revenue_last_month > 0:
            revenue_growth = ((float(revenue_this_month) - float(revenue_last_month)) / float(revenue_last_month)) * 100
        
        # Monthly revenue trend (last 12 months)
        revenue_trend_query = db.session.query(
            func.date_format(Invoice.invoice_date, '%Y-%m').label('month'),
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('revenue')
        ).join(InvoiceLineItem).filter(
            and_(
                Invoice.invoice_date >= today - timedelta(days=365),
                Invoice.status != 'draft'
            )
        ).group_by(func.date_format(Invoice.invoice_date, '%Y-%m')).order_by('month').all()
        
        revenue_trend = {
            'labels': [result.month for result in revenue_trend_query],
            'data': [float(result.revenue) for result in revenue_trend_query]
        }
        
        # Top clients by revenue
        top_clients_query = db.session.query(
            Client.client_name,
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('revenue')
        ).join(Invoice).join(InvoiceLineItem).filter(
            and_(
                Invoice.invoice_date >= this_year_start,
                Invoice.status != 'draft'
            )
        ).group_by(Client.client_id).order_by(func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).desc()).limit(5).all()
        
        top_clients = [
            {'client_name': result.client_name, 'revenue': float(result.revenue)}
            for result in top_clients_query
        ]
        
        # Service usage distribution
        service_usage_query = db.session.query(
            Service.service_name,
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('revenue')
        ).join(PricingComponent).join(InvoiceLineItem).join(Invoice).filter(
            and_(
                Invoice.invoice_date >= this_year_start,
                Invoice.status != 'draft'
            )
        ).group_by(Service.service_id).order_by(func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).desc()).limit(10).all()
        
        service_usage = [
            {'service_name': result.service_name, 'revenue': float(result.revenue)}
            for result in service_usage_query
        ]
        
        # Invoice status distribution
        invoice_status_query = db.session.query(
            Invoice.status,
            func.count(Invoice.invoice_id).label('count')
        ).group_by(Invoice.status).all()
        
        invoice_status = [
            {'status': result.status.value, 'count': result.count}
            for result in invoice_status_query
        ]
        
        # Recent activity (last 10 usage imports)
        recent_imports = UsageImport.query.order_by(UsageImport.import_date.desc()).limit(10).all()
        recent_activity = [
            {
                'type': 'usage_import',
                'description': f"Usage import for {imp.client.client_name}",
                'status': imp.status.value,
                'date': imp.import_date.isoformat()
            }
            for imp in recent_imports
        ]
        
        analytics_data = {
            'total_clients': total_clients,
            'total_users': total_users,
            'total_services': total_services,
            'active_aws_accounts': aws_accounts,
            'total_invoices': total_invoices,
            'revenue_this_month': float(revenue_this_month),
            'revenue_last_month': float(revenue_last_month),
            'revenue_growth': round(revenue_growth, 2),
            'revenue_trend': revenue_trend,
            'top_clients': top_clients,
            'service_usage': service_usage,
            'invoice_status': invoice_status,
            'recent_activity': recent_activity,
            'generated_at': datetime.utcnow().isoformat()
        }
        
        # Cache for 15 minutes
        redis_client.setex(cache_key, 900, json.dumps(analytics_data))
        
        return jsonify(analytics_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Get super admin analytics error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/client-manager', methods=['GET'])
@login_required
@require_permission('Analytics', 'view')
def get_client_manager_analytics():
    """Get analytics data for Client Manager dashboard"""
    try:
        # Only Client Managers can access this
        if current_user.role.role_name != 'Client Manager':
            return jsonify({'error': 'Access denied'}), 403
        
        # Check cache first
        cache_key = f'analytics_client_manager_{current_user.user_id}'
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return jsonify(json.loads(cached_data)), 200
        
        # Get assigned client IDs
        assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
        
        if not assigned_client_ids:
            return jsonify({
                'assigned_clients': 0,
                'total_invoices': 0,
                'revenue_this_month': 0,
                'pending_invoices': 0,
                'overdue_invoices': 0,
                'message': 'No clients assigned'
            }), 200
        
        # Calculate date ranges
        today = datetime.utcnow().date()
        this_month_start = today.replace(day=1)
        
        # Basic counts
        assigned_clients = len(assigned_client_ids)
        
        # Invoice statistics for assigned clients
        total_invoices = Invoice.query.filter(
            and_(
                Invoice.client_id.in_(assigned_client_ids),
                Invoice.status != 'draft'
            )
        ).count()
        
        # Revenue this month for assigned clients
        revenue_this_month = db.session.query(
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100))
        ).join(Invoice).filter(
            and_(
                Invoice.client_id.in_(assigned_client_ids),
                Invoice.invoice_date >= this_month_start,
                Invoice.status != 'draft'
            )
        ).scalar() or 0
        
        # Pending invoices
        pending_invoices = Invoice.query.filter(
            and_(
                Invoice.client_id.in_(assigned_client_ids),
                Invoice.status.in_(['draft', 'approved'])
            )
        ).count()
        
        # Overdue invoices
        overdue_invoices = Invoice.query.filter(
            and_(
                Invoice.client_id.in_(assigned_client_ids),
                Invoice.due_date < today,
                Invoice.status.in_(['finalized', 'sent'])
            )
        ).count()
        
        # Client revenue breakdown
        client_revenue_query = db.session.query(
            Client.client_name,
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('revenue')
        ).join(Invoice).join(InvoiceLineItem).filter(
            and_(
                Invoice.client_id.in_(assigned_client_ids),
                Invoice.invoice_date >= this_month_start,
                Invoice.status != 'draft'
            )
        ).group_by(Client.client_id).order_by(func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).desc()).all()
        
        client_revenue = [
            {'client_name': result.client_name, 'revenue': float(result.revenue)}
            for result in client_revenue_query
        ]
        
        # Monthly trend for assigned clients (last 6 months)
        monthly_trend_query = db.session.query(
            func.date_format(Invoice.invoice_date, '%Y-%m').label('month'),
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('revenue')
        ).join(InvoiceLineItem).filter(
            and_(
                Invoice.client_id.in_(assigned_client_ids),
                Invoice.invoice_date >= today - timedelta(days=180),
                Invoice.status != 'draft'
            )
        ).group_by(func.date_format(Invoice.invoice_date, '%Y-%m')).order_by('month').all()
        
        monthly_trend = {
            'labels': [result.month for result in monthly_trend_query],
            'data': [float(result.revenue) for result in monthly_trend_query]
        }
        
        # Recent invoices for assigned clients
        recent_invoices = Invoice.query.filter(
            Invoice.client_id.in_(assigned_client_ids)
        ).order_by(Invoice.created_at.desc()).limit(5).all()
        
        recent_activity = [
            {
                'type': 'invoice',
                'description': f"Invoice {inv.invoice_number} for {inv.client.client_name}",
                'status': inv.status.value,
                'date': inv.created_at.isoformat()
            }
            for inv in recent_invoices
        ]
        
        analytics_data = {
            'assigned_clients': assigned_clients,
            'total_invoices': total_invoices,
            'revenue_this_month': float(revenue_this_month),
            'pending_invoices': pending_invoices,
            'overdue_invoices': overdue_invoices,
            'client_revenue': client_revenue,
            'monthly_trend': monthly_trend,
            'recent_activity': recent_activity,
            'generated_at': datetime.utcnow().isoformat()
        }
        
        # Cache for 15 minutes
        redis_client.setex(cache_key, 900, json.dumps(analytics_data))
        
        return jsonify(analytics_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Get client manager analytics error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/auditor', methods=['GET'])
@login_required
@require_permission('Analytics', 'view')
def get_auditor_analytics():
    """Get analytics data for Auditor dashboard"""
    try:
        # Only Auditors can access this
        if current_user.role.role_name != 'Auditor':
            return jsonify({'error': 'Access denied'}), 403
        
        # Check cache first
        cache_key = 'analytics_auditor'
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return jsonify(json.loads(cached_data)), 200
        
        # Calculate date ranges
        today = datetime.utcnow().date()
        this_month_start = today.replace(day=1)
        this_year_start = today.replace(month=1, day=1)
        
        # Basic counts (read-only view)
        total_clients = Client.query.count()
        total_invoices = Invoice.query.filter(Invoice.status != 'draft').count()
        
        # Revenue statistics
        total_revenue = db.session.query(
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100))
        ).join(Invoice).filter(Invoice.status != 'draft').scalar() or 0
        
        revenue_this_month = db.session.query(
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100))
        ).join(Invoice).filter(
            and_(
                Invoice.invoice_date >= this_month_start,
                Invoice.status != 'draft'
            )
        ).scalar() or 0
        
        revenue_this_year = db.session.query(
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100))
        ).join(Invoice).filter(
            and_(
                Invoice.invoice_date >= this_year_start,
                Invoice.status != 'draft'
            )
        ).scalar() or 0
        
        # Compliance metrics
        gst_invoices = Invoice.query.filter(
            and_(
                Invoice.gst_applicable == True,
                Invoice.status != 'draft'
            )
        ).count()
        
        overdue_invoices = Invoice.query.filter(
            and_(
                Invoice.due_date < today,
                Invoice.status.in_(['finalized', 'sent'])
            )
        ).count()
        
        # Monthly revenue trend (last 12 months)
        revenue_trend_query = db.session.query(
            func.date_format(Invoice.invoice_date, '%Y-%m').label('month'),
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('revenue')
        ).join(InvoiceLineItem).filter(
            and_(
                Invoice.invoice_date >= today - timedelta(days=365),
                Invoice.status != 'draft'
            )
        ).group_by(func.date_format(Invoice.invoice_date, '%Y-%m')).order_by('month').all()
        
        revenue_trend = {
            'labels': [result.month for result in revenue_trend_query],
            'data': [float(result.revenue) for result in revenue_trend_query]
        }
        
        # Invoice status distribution
        invoice_status_query = db.session.query(
            Invoice.status,
            func.count(Invoice.invoice_id).label('count')
        ).group_by(Invoice.status).all()
        
        invoice_status = [
            {'status': result.status.value, 'count': result.count}
            for result in invoice_status_query
        ]
        
        # Client distribution by revenue
        client_distribution_query = db.session.query(
            Client.client_name,
            func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).label('revenue')
        ).join(Invoice).join(InvoiceLineItem).filter(
            and_(
                Invoice.invoice_date >= this_year_start,
                Invoice.status != 'draft'
            )
        ).group_by(Client.client_id).order_by(func.sum(InvoiceLineItem.quantity * InvoiceLineItem.rate * (1 - InvoiceLineItem.discount/100)).desc()).limit(10).all()
        
        client_distribution = [
            {'client_name': result.client_name, 'revenue': float(result.revenue)}
            for result in client_distribution_query
        ]
        
        analytics_data = {
            'total_clients': total_clients,
            'total_invoices': total_invoices,
            'total_revenue': float(total_revenue),
            'revenue_this_month': float(revenue_this_month),
            'revenue_this_year': float(revenue_this_year),
            'gst_invoices': gst_invoices,
            'overdue_invoices': overdue_invoices,
            'revenue_trend': revenue_trend,
            'invoice_status': invoice_status,
            'client_distribution': client_distribution,
            'generated_at': datetime.utcnow().isoformat()
        }
        
        # Cache for 30 minutes (longer for auditors since it's read-only)
        redis_client.setex(cache_key, 1800, json.dumps(analytics_data))
        
        return jsonify(analytics_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Get auditor analytics error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/cache', methods=['POST'])
@login_required
@require_permission('Analytics', 'create')
def cache_analytics():
    """Cache analytics data"""
    try:
        # Only Super Admins can manually cache analytics
        if current_user.role.role_name != 'Super Admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Clear existing cache
        redis_client.delete('analytics_super_admin')
        redis_client.delete('analytics_auditor')
        
        # Clear client manager caches
        client_managers = User.query.join(Role).filter(Role.role_name == 'Client Manager').all()
        for manager in client_managers:
            redis_client.delete(f'analytics_client_manager_{manager.user_id}')
        
        return jsonify({'message': 'Analytics cache cleared'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Cache analytics error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/cache', methods=['PUT'])
@login_required
@require_permission('Analytics', 'edit')
def refresh_analytics_cache():
    """Refresh analytics cache"""
    try:
        # Only Super Admins can refresh cache
        if current_user.role.role_name != 'Super Admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # This would trigger cache refresh by calling the analytics endpoints
        # For now, just clear the cache
        redis_client.delete('analytics_super_admin')
        redis_client.delete('analytics_auditor')
        
        # Clear client manager caches
        client_managers = User.query.join(Role).filter(Role.role_name == 'Client Manager').all()
        for manager in client_managers:
            redis_client.delete(f'analytics_client_manager_{manager.user_id}')
        
        return jsonify({'message': 'Analytics cache refreshed'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Refresh analytics cache error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/cache', methods=['DELETE'])
@login_required
@require_permission('Analytics', 'delete')
def clear_analytics_cache():
    """Clear analytics cache"""
    try:
        # Only Super Admins can clear cache
        if current_user.role.role_name != 'Super Admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Clear all analytics cache
        redis_client.delete('analytics_super_admin')
        redis_client.delete('analytics_auditor')
        
        # Clear client manager caches
        client_managers = User.query.join(Role).filter(Role.role_name == 'Client Manager').all()
        for manager in client_managers:
            redis_client.delete(f'analytics_client_manager_{manager.user_id}')
        
        return jsonify({'message': 'Analytics cache cleared'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Clear analytics cache error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500