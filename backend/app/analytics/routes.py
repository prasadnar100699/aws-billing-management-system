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
@require_permission('analytics', 'view')
def get_super_admin_analytics():
    """Get analytics data for Super Admin dashboard"""
    try:
        # Only Super Admins can access this
        if current_user.role.role_name != 'Super Admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Check cache first
        cache_key = 'analytics_super_admin'
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                return jsonify(json.loads(cached_data)), 200
        except:
            pass  # Continue without cache
        
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
        
        # Mock revenue data for demo
        revenue_this_month = 67000
        revenue_last_month = 55000
        revenue_growth = 21.8
        
        # Mock analytics data
        analytics_data = {
            'total_clients': total_clients,
            'total_users': total_users,
            'total_services': total_services,
            'active_aws_accounts': aws_accounts,
            'total_invoices': total_invoices,
            'revenue_this_month': revenue_this_month,
            'revenue_last_month': revenue_last_month,
            'revenue_growth': revenue_growth,
            'revenue_trend': {
                'labels': ['Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'],
                'data': [
                    {'month': 'Jul 2024', 'revenue': 45000},
                    {'month': 'Aug 2024', 'revenue': 52000},
                    {'month': 'Sep 2024', 'revenue': 48000},
                    {'month': 'Oct 2024', 'revenue': 61000},
                    {'month': 'Nov 2024', 'revenue': 55000},
                    {'month': 'Dec 2024', 'revenue': 67000}
                ]
            },
            'top_clients': [
                {'client_name': 'TechCorp Inc', 'revenue': 85000},
                {'client_name': 'CloudTech Solutions', 'revenue': 62000},
                {'client_name': 'DataFlow Ltd', 'revenue': 48000}
            ],
            'service_usage': [
                {'service_name': 'Amazon EC2', 'revenue': 125000},
                {'service_name': 'Amazon S3', 'revenue': 45000},
                {'service_name': 'Amazon RDS', 'revenue': 38000},
                {'service_name': 'Amazon CloudFront', 'revenue': 22000}
            ],
            'invoice_status': [
                {'status': 'paid', 'count': 8},
                {'status': 'sent', 'count': 2},
                {'status': 'approved', 'count': 1},
                {'status': 'draft', 'count': 1}
            ],
            'recent_activity': [
                {
                    'type': 'invoice',
                    'description': 'Invoice created for TechCorp Inc',
                    'status': 'completed',
                    'date': datetime.utcnow().isoformat()
                }
            ],
            'generated_at': datetime.utcnow().isoformat()
        }
        
        # Cache for 15 minutes
        try:
            redis_client.setex(cache_key, 900, json.dumps(analytics_data))
        except:
            pass  # Continue without cache
        
        return jsonify(analytics_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Get super admin analytics error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/client-manager', methods=['GET'])
@login_required
@require_permission('analytics', 'view')
def get_client_manager_analytics():
    """Get analytics data for Client Manager dashboard"""
    try:
        # Only Client Managers can access this
        if current_user.role.role_name != 'Client Manager':
            return jsonify({'error': 'Access denied'}), 403
        
        # Mock analytics data for Client Manager
        analytics_data = {
            'assigned_clients': 2,
            'total_invoices': 8,
            'revenue_this_month': 45000,
            'pending_invoices': 2,
            'overdue_invoices': 1,
            'client_revenue': [
                {'client_name': 'TechCorp Inc', 'revenue': 28000},
                {'client_name': 'CloudTech Solutions', 'revenue': 17000}
            ],
            'monthly_trend': {
                'labels': ['Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'],
                'data': [32000, 28000, 41000, 35000, 45000]
            },
            'recent_activity': [
                {
                    'type': 'invoice',
                    'description': 'Invoice created for TechCorp Inc',
                    'status': 'sent',
                    'date': datetime.utcnow().isoformat()
                }
            ],
            'generated_at': datetime.utcnow().isoformat()
        }
        
        return jsonify(analytics_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Get client manager analytics error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/auditor', methods=['GET'])
@login_required
@require_permission('analytics', 'view')
def get_auditor_analytics():
    """Get analytics data for Auditor dashboard"""
    try:
        # Only Auditors can access this
        if current_user.role.role_name != 'Auditor':
            return jsonify({'error': 'Access denied'}), 403
        
        # Mock analytics data for Auditor
        analytics_data = {
            'total_clients': 3,
            'total_invoices': 12,
            'total_revenue': 244000,
            'revenue_this_month': 67000,
            'revenue_this_year': 244000,
            'gst_invoices': 6,
            'overdue_invoices': 1,
            'revenue_trend': {
                'labels': ['Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'],
                'data': [
                    {'month': 'Jul 2024', 'revenue': 45000},
                    {'month': 'Aug 2024', 'revenue': 52000},
                    {'month': 'Sep 2024', 'revenue': 48000},
                    {'month': 'Oct 2024', 'revenue': 61000},
                    {'month': 'Nov 2024', 'revenue': 55000},
                    {'month': 'Dec 2024', 'revenue': 67000}
                ]
            },
            'invoice_status': [
                {'status': 'paid', 'count': 8},
                {'status': 'sent', 'count': 2},
                {'status': 'approved', 'count': 1},
                {'status': 'overdue', 'count': 1}
            ],
            'client_distribution': [
                {'client_name': 'TechCorp Inc', 'revenue': 85000},
                {'client_name': 'CloudTech Solutions', 'revenue': 62000},
                {'client_name': 'DataFlow Ltd', 'revenue': 48000}
            ],
            'generated_at': datetime.utcnow().isoformat()
        }
        
        return jsonify(analytics_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Get auditor analytics error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500