from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app import db
from app.models.users import User, Role
from app.models.exchange_rates import ExchangeRate
from app.models.credentials import Credential
from app.models.audit_log import AuditLog
from app.models.notifications import Notification
import requests

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users')
@jwt_required()
def manage_users():
    """Manage users (Super Admin only)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Super Admin access required'}), 403
        flash('Super Admin access required', 'error')
        return redirect(url_for('auth.dashboard'))
    
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    role_filter = request.args.get('role', '')
    
    query = User.query
    
    if search:
        query = query.filter(
            db.or_(
                User.username.contains(search),
                User.email.contains(search),
                User.first_name.contains(search),
                User.last_name.contains(search)
            )
        )
    
    if role_filter:
        query = query.join(Role).filter(Role.name == role_filter)
    
    users = query.order_by(User.created_at.desc())\
        .paginate(page=page, per_page=20, error_out=False)
    
    roles = Role.query.all()
    
    if request.is_json:
        return jsonify({
            'users': [u.to_dict() for u in users.items],
            'total': users.total,
            'pages': users.pages,
            'current_page': page,
            'roles': [{'id': r.id, 'name': r.name} for r in roles]
        })
    
    return render_template('admin/users.html', 
                         users=users, 
                         roles=roles,
                         search=search,
                         role_filter=role_filter)

@admin_bp.route('/users/create', methods=['GET', 'POST'])
@jwt_required()
def create_user():
    """Create new user (Super Admin only)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Super Admin access required'}), 403
        flash('Super Admin access required', 'error')
        return redirect(url_for('admin.manage_users'))
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        
        try:
            # Check if username or email already exists
            if User.query.filter_by(username=data.get('username')).first():
                raise ValueError('Username already exists')
            if User.query.filter_by(email=data.get('email')).first():
                raise ValueError('Email already exists')
            
            new_user = User(
                username=data.get('username'),
                email=data.get('email'),
                first_name=data.get('first_name'),
                last_name=data.get('last_name'),
                role_id=int(data.get('role_id'))
            )
            
            new_user.set_password(data.get('password'))
            
            db.session.add(new_user)
            db.session.commit()
            
            # Log user creation
            AuditLog.log_action(
                user_id=user_id,
                action='create',
                resource_type='user',
                resource_id=new_user.id,
                new_values=new_user.to_dict()
            )
            
            # Send notification to new user
            Notification.create_notification(
                user_id=new_user.id,
                title='Welcome to Tej IT Solutions Billing System',
                message='Your account has been created. Please log in with your credentials.',
                notification_type='info',
                category='system'
            )
            
            if request.is_json:
                return jsonify({'message': 'User created successfully', 'user': new_user.to_dict()}), 201
            
            flash('User created successfully', 'success')
            return redirect(url_for('admin.manage_users'))
            
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'error': f'Failed to create user: {str(e)}'}), 400
            flash(f'Failed to create user: {str(e)}', 'error')
    
    roles = Role.query.all()
    return render_template('admin/create_user.html', roles=roles)

@admin_bp.route('/users/<int:user_id>/edit', methods=['GET', 'POST'])
@jwt_required()
def edit_user(user_id):
    """Edit user (Super Admin only)."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Super Admin access required'}), 403
        flash('Super Admin access required', 'error')
        return redirect(url_for('admin.manage_users'))
    
    edit_user = User.query.get_or_404(user_id)
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        
        # Store old values for audit log
        old_values = edit_user.to_dict()
        
        try:
            edit_user.username = data.get('username', edit_user.username)
            edit_user.email = data.get('email', edit_user.email)
            edit_user.first_name = data.get('first_name', edit_user.first_name)
            edit_user.last_name = data.get('last_name', edit_user.last_name)
            edit_user.role_id = int(data.get('role_id', edit_user.role_id))
            edit_user.is_active = data.get('is_active', 'true').lower() == 'true'
            
            # Only update password if provided
            if data.get('password'):
                edit_user.set_password(data.get('password'))
            
            db.session.commit()
            
            # Log user update
            AuditLog.log_action(
                user_id=current_user_id,
                action='update',
                resource_type='user',
                resource_id=user_id,
                old_values=old_values,
                new_values=edit_user.to_dict()
            )
            
            if request.is_json:
                return jsonify({'message': 'User updated successfully', 'user': edit_user.to_dict()})
            
            flash('User updated successfully', 'success')
            return redirect(url_for('admin.manage_users'))
            
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'error': f'Failed to update user: {str(e)}'}), 400
            flash(f'Failed to update user: {str(e)}', 'error')
    
    roles = Role.query.all()
    return render_template('admin/edit_user.html', user=edit_user, roles=roles)

@admin_bp.route('/exchange-rates')
@jwt_required()
def manage_exchange_rates():
    """Manage exchange rates."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not (user.is_super_admin or user.is_client_manager):
        if request.is_json:
            return jsonify({'error': 'Insufficient permissions'}), 403
        flash('Insufficient permissions', 'error')
        return redirect(url_for('auth.dashboard'))
    
    page = request.args.get('page', 1, type=int)
    
    rates = ExchangeRate.query.filter_by(is_active=True)\
        .order_by(ExchangeRate.rate_date.desc())\
        .paginate(page=page, per_page=20, error_out=False)
    
    # Get latest rate
    latest_rate = ExchangeRate.get_latest_rate()
    
    if request.is_json:
        return jsonify({
            'exchange_rates': [rate.to_dict() for rate in rates.items],
            'latest_rate': latest_rate.to_dict() if latest_rate else None,
            'total': rates.total,
            'pages': rates.pages,
            'current_page': page
        })
    
    return render_template('admin/exchange_rates.html', 
                         rates=rates,
                         latest_rate=latest_rate)

@admin_bp.route('/exchange-rates/add', methods=['POST'])
@jwt_required()
def add_exchange_rate():
    """Add new exchange rate."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not (user.is_super_admin or user.is_client_manager):
        if request.is_json:
            return jsonify({'error': 'Insufficient permissions'}), 403
        flash('Insufficient permissions', 'error')
        return redirect(url_for('admin.manage_exchange_rates'))
    
    data = request.get_json() if request.is_json else request.form
    
    try:
        rate_date = datetime.strptime(data.get('rate_date'), '%Y-%m-%d').date()
        
        # Check if rate already exists for this date
        existing_rate = ExchangeRate.query.filter_by(
            from_currency=data.get('from_currency', 'USD'),
            to_currency=data.get('to_currency', 'INR'),
            rate_date=rate_date
        ).first()
        
        if existing_rate:
            # Update existing rate
            existing_rate.rate = float(data.get('rate'))
            existing_rate.source = data.get('source', 'manual')
        else:
            # Create new rate
            new_rate = ExchangeRate(
                from_currency=data.get('from_currency', 'USD'),
                to_currency=data.get('to_currency', 'INR'),
                rate=float(data.get('rate')),
                rate_date=rate_date,
                source=data.get('source', 'manual')
            )
            db.session.add(new_rate)
        
        db.session.commit()
        
        # Log rate addition/update
        AuditLog.log_action(
            user_id=user_id,
            action='create' if not existing_rate else 'update',
            resource_type='exchange_rate',
            new_values={
                'rate': float(data.get('rate')),
                'rate_date': rate_date.isoformat(),
                'source': data.get('source', 'manual')
            }
        )
        
        if request.is_json:
            return jsonify({'message': 'Exchange rate added successfully'})
        
        flash('Exchange rate added successfully', 'success')
        
    except Exception as e:
        db.session.rollback()
        if request.is_json:
            return jsonify({'error': f'Failed to add exchange rate: {str(e)}'}), 400
        flash(f'Failed to add exchange rate: {str(e)}', 'error')
    
    return redirect(url_for('admin.manage_exchange_rates'))

@admin_bp.route('/exchange-rates/fetch-latest', methods=['POST'])
@jwt_required()
def fetch_latest_exchange_rate():
    """Fetch latest exchange rate from external API."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Super Admin access required'}), 403
        flash('Super Admin access required', 'error')
        return redirect(url_for('admin.manage_exchange_rates'))
    
    try:
        # Example API call (you would replace with actual API)
        # For demo purposes, we'll use a mock rate
        current_rate = 83.25  # Mock USD to INR rate
        
        # In production, you would call a real API like:
        # response = requests.get('https://api.exchangerate-api.com/v4/latest/USD')
        # current_rate = response.json()['rates']['INR']
        
        rate_date = datetime.utcnow().date()
        
        # Check if rate already exists for today
        existing_rate = ExchangeRate.get_rate_on_date(rate_date)
        
        if existing_rate:
            existing_rate.rate = current_rate
            existing_rate.source = 'API'
        else:
            new_rate = ExchangeRate(
                from_currency='USD',
                to_currency='INR',
                rate=current_rate,
                rate_date=rate_date,
                source='API'
            )
            db.session.add(new_rate)
        
        db.session.commit()
        
        if request.is_json:
            return jsonify({
                'message': 'Latest exchange rate fetched successfully',
                'rate': current_rate
            })
        
        flash(f'Latest exchange rate fetched: {current_rate}', 'success')
        
    except Exception as e:
        if request.is_json:
            return jsonify({'error': f'Failed to fetch exchange rate: {str(e)}'}), 400
        flash(f'Failed to fetch exchange rate: {str(e)}', 'error')
    
    return redirect(url_for('admin.manage_exchange_rates'))

@admin_bp.route('/credentials')
@jwt_required()
def manage_credentials():
    """Manage infrastructure credentials (Super Admin only)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Super Admin access required'}), 403
        flash('Super Admin access required', 'error')
        return redirect(url_for('auth.dashboard'))
    
    page = request.args.get('page', 1, type=int)
    client_id = request.args.get('client_id', type=int)
    credential_type = request.args.get('type', '')
    
    query = Credential.query.filter_by(is_active=True)
    
    if client_id:
        query = query.filter_by(client_id=client_id)
    if credential_type:
        query = query.filter_by(credential_type=credential_type)
    
    credentials = query.order_by(Credential.created_at.desc())\
        .paginate(page=page, per_page=20, error_out=False)
    
    # Get clients and credential types for filters
    from app.models.clients import Client
    clients = Client.query.filter_by(is_active=True).all()
    
    credential_types = db.session.query(Credential.credential_type)\
        .filter_by(is_active=True)\
        .distinct().all()
    credential_types = [ct[0] for ct in credential_types]
    
    if request.is_json:
        return jsonify({
            'credentials': [cred.to_dict() for cred in credentials.items],
            'total': credentials.total,
            'pages': credentials.pages,
            'current_page': page
        })
    
    return render_template('admin/credentials.html',
                         credentials=credentials,
                         clients=clients,
                         credential_types=credential_types,
                         filters={
                             'client_id': client_id,
                             'type': credential_type
                         })

@admin_bp.route('/credentials/create', methods=['GET', 'POST'])
@jwt_required()
def create_credential():
    """Create new credential (Super Admin only)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Super Admin access required'}), 403
        flash('Super Admin access required', 'error')
        return redirect(url_for('admin.manage_credentials'))
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        
        try:
            # Prepare credential data
            credential_data = {
                'username': data.get('username', ''),
                'password': data.get('password', ''),
                'host': data.get('host', ''),
                'port': data.get('port', ''),
                'database': data.get('database', ''),
                'access_key': data.get('access_key', ''),
                'secret_key': data.get('secret_key', ''),
                'additional_info': data.get('additional_info', '')
            }
            
            credential = Credential(
                client_id=int(data.get('client_id')),
                name=data.get('name'),
                credential_type=data.get('credential_type'),
                description=data.get('description', ''),
                environment=data.get('environment', 'production'),
                created_by=user_id
            )
            
            # Set expiry if provided
            if data.get('expires_at'):
                credential.expires_at = datetime.strptime(data.get('expires_at'), '%Y-%m-%d')
            
            # Encrypt and store credential data
            credential.set_credential_data(credential_data)
            
            db.session.add(credential)
            db.session.commit()
            
            # Log credential creation
            AuditLog.log_action(
                user_id=user_id,
                action='create',
                resource_type='credential',
                resource_id=credential.id,
                new_values=credential.to_dict()
            )
            
            if request.is_json:
                return jsonify({'message': 'Credential created successfully'}), 201
            
            flash('Credential created successfully', 'success')
            return redirect(url_for('admin.manage_credentials'))
            
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'error': f'Failed to create credential: {str(e)}'}), 400
            flash(f'Failed to create credential: {str(e)}', 'error')
    
    from app.models.clients import Client
    clients = Client.query.filter_by(is_active=True).all()
    
    return render_template('admin/create_credential.html', clients=clients)

@admin_bp.route('/credentials/<int:credential_id>/view')
@jwt_required()
def view_credential(credential_id):
    """View and decrypt credential (Super Admin only)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Super Admin access required'}), 403
        flash('Super Admin access required', 'error')
        return redirect(url_for('admin.manage_credentials'))
    
    credential = Credential.query.get_or_404(credential_id)
    
    # Record access
    credential.record_access(user_id)
    db.session.commit()
    
    # Log credential access
    AuditLog.log_action(
        user_id=user_id,
        action='read',
        resource_type='credential',
        resource_id=credential_id
    )
    
    if request.is_json:
        return jsonify({'credential': credential.to_dict(include_data=True)})
    
    return render_template('admin/view_credential.html', credential=credential)

@admin_bp.route('/system-settings')
@jwt_required()
def system_settings():
    """System settings (Super Admin only)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Super Admin access required'}), 403
        flash('Super Admin access required', 'error')
        return redirect(url_for('auth.dashboard'))
    
    # Get system statistics
    from app.models.clients import Client
    from app.models.invoices import Invoice
    from app.models.payments import Payment
    
    stats = {
        'total_users': User.query.count(),
        'active_users': User.query.filter_by(is_active=True).count(),
        'total_clients': Client.query.filter_by(is_active=True).count(),
        'total_invoices': Invoice.query.count(),
        'total_payments': Payment.query.count(),
        'total_credentials': Credential.query.filter_by(is_active=True).count(),
        'audit_log_entries': AuditLog.query.count()
    }
    
    # Get recent audit logs
    recent_logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(10).all()
    
    if request.is_json:
        return jsonify({
            'stats': stats,
            'recent_logs': [log.to_dict() for log in recent_logs]
        })
    
    return render_template('admin/system_settings.html', stats=stats, recent_logs=recent_logs)

@admin_bp.route('/backup-database', methods=['POST'])
@jwt_required()
def backup_database():
    """Create database backup (Super Admin only)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Super Admin access required'}), 403
        flash('Super Admin access required', 'error')
        return redirect(url_for('admin.system_settings'))
    
    try:
        import subprocess
        import os
        from flask import current_app
        
        # Create backup directory
        backup_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        # Generate backup filename
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'tej_billing_backup_{timestamp}.sql'
        backup_path = os.path.join(backup_dir, backup_filename)
        
        # Create backup (example for MySQL)
        # In production, you would use actual database credentials
        backup_command = [
            'mysqldump',
            '-h', 'localhost',
            '-u', 'root',
            '-p', 'password',
            'tej_billing_db'
        ]
        
        with open(backup_path, 'w') as backup_file:
            subprocess.run(backup_command, stdout=backup_file, check=True)
        
        # Log backup creation
        AuditLog.log_action(
            user_id=user_id,
            action='backup',
            resource_type='database',
            new_values={'backup_file': backup_filename}
        )
        
        if request.is_json:
            return jsonify({'message': f'Database backup created: {backup_filename}'})
        
        flash(f'Database backup created: {backup_filename}', 'success')
        
    except Exception as e:
        if request.is_json:
            return jsonify({'error': f'Failed to create backup: {str(e)}'}), 400
        flash(f'Failed to create backup: {str(e)}', 'error')
    
    return redirect(url_for('admin.system_settings'))

@admin_bp.route('/delegate-admin', methods=['POST'])
@jwt_required()
def delegate_admin():
    """Delegate admin access temporarily (Super Admin only)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Super Admin access required'}), 403
        flash('Super Admin access required', 'error')
        return redirect(url_for('admin.system_settings'))
    
    data = request.get_json() if request.is_json else request.form
    
    try:
        delegate_user_id = int(data.get('user_id'))
        duration_days = int(data.get('duration_days', 7))
        
        delegate_user = User.query.get(delegate_user_id)
        if not delegate_user:
            raise ValueError('User not found')
        
        # Set delegation
        delegate_user.is_delegated_admin = True
        delegate_user.delegation_expires = datetime.utcnow() + timedelta(days=duration_days)
        delegate_user.delegated_by = user_id
        
        db.session.commit()
        
        # Log delegation
        AuditLog.log_action(
            user_id=user_id,
            action='delegate',
            resource_type='user',
            resource_id=delegate_user_id,
            new_values={
                'delegated_admin': True,
                'expires': delegate_user.delegation_expires.isoformat()
            }
        )
        
        # Send notification to delegated user
        Notification.create_notification(
            user_id=delegate_user_id,
            title='Admin Access Delegated',
            message=f'You have been granted temporary admin access until {delegate_user.delegation_expires.strftime("%Y-%m-%d")}',
            notification_type='info',
            category='system'
        )
        
        if request.is_json:
            return jsonify({'message': 'Admin access delegated successfully'})
        
        flash('Admin access delegated successfully', 'success')
        
    except Exception as e:
        db.session.rollback()
        if request.is_json:
            return jsonify({'error': f'Failed to delegate admin access: {str(e)}'}), 400
        flash(f'Failed to delegate admin access: {str(e)}', 'error')
    
    return redirect(url_for('admin.system_settings'))