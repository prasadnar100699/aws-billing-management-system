from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify, session
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, create_refresh_token
from werkzeug.security import check_password_hash
from datetime import datetime, timedelta
from app import db
from app.models.users import User, Role
from app.models.audit_log import AuditLog
from app.models.notifications import Notification

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """User login."""
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            if request.is_json:
                return jsonify({'error': 'Username and password required'}), 400
            flash('Username and password required', 'error')
            return render_template('auth/login.html')
        
        # Find user
        user = User.query.filter_by(username=username, is_active=True).first()
        
        if user and user.check_password(password):
            # Update last login
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            # Create tokens
            access_token = create_access_token(identity=user.id)
            refresh_token = create_refresh_token(identity=user.id)
            
            # Log successful login
            AuditLog.log_action(
                user_id=user.id,
                action='login',
                resource_type='user',
                status='success',
                request_data={
                    'ip_address': request.remote_addr,
                    'user_agent': request.headers.get('User-Agent'),
                    'method': request.method,
                    'url': request.url
                }
            )
            
            if request.is_json:
                return jsonify({
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'user': user.to_dict()
                })
            
            # Store token in session for web interface
            session['access_token'] = access_token
            return redirect(url_for('auth.dashboard'))
        
        # Log failed login
        AuditLog.log_action(
            user_id=user.id if user else None,
            action='login',
            resource_type='user',
            status='failed',
            error_message='Invalid credentials',
            request_data={
                'ip_address': request.remote_addr,
                'user_agent': request.headers.get('User-Agent'),
                'method': request.method,
                'url': request.url
            }
        )
        
        if request.is_json:
            return jsonify({'error': 'Invalid credentials'}), 401
        flash('Invalid username or password', 'error')
    
    return render_template('auth/login.html')

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout."""
    user_id = get_jwt_identity()
    
    # Log logout
    AuditLog.log_action(
        user_id=user_id,
        action='logout',
        resource_type='user',
        status='success',
        request_data={
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'method': request.method,
            'url': request.url
        }
    )
    
    # Clear session
    session.clear()
    
    if request.is_json:
        return jsonify({'message': 'Logged out successfully'})
    
    flash('Logged out successfully', 'success')
    return redirect(url_for('auth.login'))

@auth_bp.route('/dashboard')
@jwt_required()
def dashboard():
    """Main dashboard."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return redirect(url_for('auth.login'))
    
    # Get dashboard data based on user role
    dashboard_data = get_dashboard_data(user)
    
    return render_template('auth/dashboard.html', user=user, data=dashboard_data)

@auth_bp.route('/profile')
@jwt_required()
def profile():
    """User profile page."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    return render_template('auth/profile.html', user=user)

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    data = request.get_json() if request.is_json else request.form
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')
    
    if not current_password or not new_password or not confirm_password:
        if request.is_json:
            return jsonify({'error': 'All password fields required'}), 400
        flash('All password fields required', 'error')
        return redirect(url_for('auth.profile'))
    
    if new_password != confirm_password:
        if request.is_json:
            return jsonify({'error': 'New passwords do not match'}), 400
        flash('New passwords do not match', 'error')
        return redirect(url_for('auth.profile'))
    
    if not user.check_password(current_password):
        if request.is_json:
            return jsonify({'error': 'Current password is incorrect'}), 400
        flash('Current password is incorrect', 'error')
        return redirect(url_for('auth.profile'))
    
    # Update password
    user.set_password(new_password)
    db.session.commit()
    
    # Log password change
    AuditLog.log_action(
        user_id=user_id,
        action='password_change',
        resource_type='user',
        resource_id=user_id,
        status='success'
    )
    
    if request.is_json:
        return jsonify({'message': 'Password changed successfully'})
    
    flash('Password changed successfully', 'success')
    return redirect(url_for('auth.profile'))

def get_dashboard_data(user):
    """Get dashboard data based on user role."""
    from app.models.clients import Client
    from app.models.invoices import Invoice
    from app.models.payments import Payment
    
    data = {}
    
    if user.is_super_admin:
        # Super Admin dashboard
        data['total_clients'] = Client.query.filter_by(is_active=True).count()
        data['total_invoices'] = Invoice.query.count()
        data['pending_invoices'] = Invoice.query.filter_by(status='Sent').count()
        data['overdue_invoices'] = Invoice.query.filter(
            Invoice.due_date < datetime.utcnow().date(),
            Invoice.status.in_(['Sent', 'Finalized'])
        ).count()
        
        # Revenue data
        total_revenue = db.session.query(
            db.func.sum(Invoice.total_amount)
        ).filter(Invoice.status.in_(['Paid', 'Sent'])).scalar() or 0
        data['total_revenue'] = float(total_revenue)
        
        # Recent invoices
        data['recent_invoices'] = [
            inv.to_dict() for inv in 
            Invoice.query.order_by(Invoice.created_at.desc()).limit(5).all()
        ]
        
    elif user.is_client_manager:
        # Client Manager dashboard
        managed_clients = user.managed_clients.filter_by(is_active=True)
        data['managed_clients'] = managed_clients.count()
        
        client_ids = [client.id for client in managed_clients]
        data['client_invoices'] = Invoice.query.filter(
            Invoice.client_id.in_(client_ids)
        ).count()
        data['pending_invoices'] = Invoice.query.filter(
            Invoice.client_id.in_(client_ids),
            Invoice.status == 'Sent'
        ).count()
        
        # Recent invoices for managed clients
        data['recent_invoices'] = [
            inv.to_dict() for inv in 
            Invoice.query.filter(Invoice.client_id.in_(client_ids))
            .order_by(Invoice.created_at.desc()).limit(5).all()
        ]
        
    else:
        # Auditor dashboard (read-only)
        data['total_clients'] = Client.query.filter_by(is_active=True).count()
        data['total_invoices'] = Invoice.query.count()
        data['audit_logs_count'] = AuditLog.query.count()
        
        # Recent audit logs
        data['recent_audit_logs'] = [
            log.to_dict() for log in 
            AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(10).all()
        ]
    
    # Notifications for all users
    data['unread_notifications'] = [
        notif.to_dict() for notif in
        Notification.query.filter_by(user_id=user.id, is_read=False)
        .order_by(Notification.created_at.desc()).limit(5).all()
    ]
    
    return data

@auth_bp.route('/notifications')
@jwt_required()
def notifications():
    """Get user notifications."""
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    
    notifications = Notification.query.filter_by(user_id=user_id)\
        .order_by(Notification.created_at.desc())\
        .paginate(page=page, per_page=20, error_out=False)
    
    if request.is_json:
        return jsonify({
            'notifications': [n.to_dict() for n in notifications.items],
            'total': notifications.total,
            'pages': notifications.pages,
            'current_page': page
        })
    
    return render_template('auth/notifications.html', notifications=notifications)

@auth_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark notification as read."""
    user_id = get_jwt_identity()
    
    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=user_id
    ).first_or_404()
    
    notification.mark_as_read()
    db.session.commit()
    
    if request.is_json:
        return jsonify({'message': 'Notification marked as read'})
    
    return redirect(url_for('auth.notifications'))