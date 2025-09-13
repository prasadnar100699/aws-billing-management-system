from flask import request, jsonify, current_app
from flask_login import login_required, current_user
from app.notifications import bp
from app.models import Notification, Client, User
from app import db
from app.utils.auth import require_permission
from app.utils.audit import log_user_action
from app.tasks.email_sender import send_notification_email
from sqlalchemy import or_, and_
from datetime import datetime

@bp.route('/', methods=['POST'])
@login_required
@require_permission('Notifications', 'create')
def create_notification():
    """Create a manual notification"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['type', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate user access if user_id provided
        user_id = data.get('user_id')
        if user_id:
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
        
        # Validate client access if client_id provided
        client_id = data.get('client_id')
        if client_id:
            client = Client.query.get(client_id)
            if not client:
                return jsonify({'error': 'Client not found'}), 404
            
            # Check if Client Manager has access to this client
            if current_user.role.role_name == 'Client Manager':
                if current_user not in client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
        
        # Create notification
        notification = Notification(
            user_id=user_id,
            client_id=client_id,
            type=data['type'],
            message=data['message'],
            status='pending'
        )
        
        db.session.add(notification)
        db.session.commit()
        
        # Queue email sending if user_id is provided
        if user_id:
            task = send_notification_email.delay(notification.notification_id)
        
        log_user_action(current_user.user_id, 'create_notification', 
                       f"Created notification: {data['type']}")
        
        return jsonify({
            'message': 'Notification created successfully',
            'notification': notification.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create notification error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/', methods=['GET'])
@login_required
@require_permission('Notifications', 'view')
def list_notifications():
    """List notifications with filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        sort = request.args.get('sort', 'created_at')
        notification_type = request.args.get('type')
        status = request.args.get('status')
        user_id = request.args.get('user_id', type=int)
        client_id = request.args.get('client_id', type=int)
        
        # Build query
        query = Notification.query
        
        # For Client Managers, only show notifications for assigned clients or themselves
        if current_user.role.role_name == 'Client Manager':
            assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
            query = query.filter(or_(
                Notification.client_id.in_(assigned_client_ids),
                Notification.user_id == current_user.user_id,
                and_(Notification.client_id.is_(None), Notification.user_id.is_(None))  # System notifications
            ))
        
        # Apply filters
        if notification_type:
            query = query.filter(Notification.type == notification_type)
        
        if status:
            query = query.filter(Notification.status == status)
        
        if user_id:
            query = query.filter(Notification.user_id == user_id)
        
        if client_id:
            query = query.filter(Notification.client_id == client_id)
        
        # Apply sorting
        if sort == 'created_at':
            query = query.order_by(Notification.created_at.desc())
        elif sort == 'sent_at':
            query = query.order_by(Notification.sent_at.desc())
        elif sort == 'type':
            query = query.order_by(Notification.type)
        elif sort == 'status':
            query = query.order_by(Notification.status)
        else:
            query = query.order_by(Notification.created_at.desc())
        
        # Paginate results
        notifications = query.paginate(page=page, per_page=limit, error_out=False)
        
        return jsonify({
            'notifications': [notification.to_dict() for notification in notifications.items],
            'total': notifications.total,
            'pages': notifications.pages,
            'current_page': page,
            'per_page': limit
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List notifications error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:notification_id>', methods=['GET'])
@login_required
@require_permission('Notifications', 'view')
def get_notification(notification_id):
    """Get notification details"""
    try:
        notification = Notification.query.get_or_404(notification_id)
        
        # Check access for Client Managers
        if current_user.role.role_name == 'Client Manager':
            if notification.client_id:
                if current_user not in notification.client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
            elif notification.user_id and notification.user_id != current_user.user_id:
                return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'notification': notification.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get notification error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:notification_id>', methods=['PUT'])
@login_required
@require_permission('Notifications', 'edit')
def update_notification(notification_id):
    """Update notification status"""
    try:
        notification = Notification.query.get_or_404(notification_id)
        
        # Check access for Client Managers
        if current_user.role.role_name == 'Client Manager':
            if notification.client_id:
                if current_user not in notification.client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
            elif notification.user_id and notification.user_id != current_user.user_id:
                return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        # Update fields
        if 'status' in data:
            notification.status = data['status']
            if data['status'] == 'sent' and not notification.sent_at:
                notification.sent_at = datetime.utcnow()
        
        if 'message' in data:
            notification.message = data['message']
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'update_notification', 
                       f"Updated notification: {notification_id}")
        
        return jsonify({
            'message': 'Notification updated successfully',
            'notification': notification.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update notification error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:notification_id>', methods=['DELETE'])
@login_required
@require_permission('Notifications', 'delete')
def delete_notification(notification_id):
    """Delete notification"""
    try:
        notification = Notification.query.get_or_404(notification_id)
        
        # Check access for Client Managers
        if current_user.role.role_name == 'Client Manager':
            if notification.client_id:
                if current_user not in notification.client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
            elif notification.user_id and notification.user_id != current_user.user_id:
                return jsonify({'error': 'Access denied'}), 403
        
        db.session.delete(notification)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'delete_notification', 
                       f"Deleted notification: {notification_id}")
        
        return jsonify({'message': 'Notification deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete notification error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/send/<int:notification_id>', methods=['POST'])
@login_required
@require_permission('Notifications', 'edit')
def send_notification(notification_id):
    """Send notification via email"""
    try:
        notification = Notification.query.get_or_404(notification_id)
        
        # Check access for Client Managers
        if current_user.role.role_name == 'Client Manager':
            if notification.client_id:
                if current_user not in notification.client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
            elif notification.user_id and notification.user_id != current_user.user_id:
                return jsonify({'error': 'Access denied'}), 403
        
        # Must have a user to send to
        if not notification.user_id:
            return jsonify({'error': 'Cannot send notification without a user'}), 400
        
        # Queue email sending
        task = send_notification_email.delay(notification_id)
        
        log_user_action(current_user.user_id, 'send_notification', 
                       f"Queued sending for notification: {notification_id}")
        
        return jsonify({
            'message': 'Notification email queued',
            'task_id': task.id
        }), 202
        
    except Exception as e:
        current_app.logger.error(f"Send notification error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/overdue', methods=['POST'])
@login_required
@require_permission('Notifications', 'create')
def create_overdue_notifications():
    """Create overdue invoice notifications"""
    try:
        from app.models import Invoice
        from datetime import date
        
        # Find overdue invoices
        today = date.today()
        overdue_invoices = Invoice.query.filter(
            and_(
                Invoice.due_date < today,
                Invoice.status.in_(['finalized', 'sent'])
            )
        ).all()
        
        notifications_created = 0
        
        for invoice in overdue_invoices:
            # Check if Client Manager has access
            if current_user.role.role_name == 'Client Manager':
                if current_user not in invoice.client.assigned_managers:
                    continue
            
            # Check if notification already exists for this invoice
            existing = Notification.query.filter(
                and_(
                    Notification.type == 'overdue',
                    Notification.client_id == invoice.client_id,
                    Notification.message.contains(invoice.invoice_number)
                )
            ).first()
            
            if not existing:
                days_overdue = (today - invoice.due_date).days
                message = f"Invoice {invoice.invoice_number} is {days_overdue} days overdue. Amount: ${invoice.calculate_totals()['total']:.2f}"
                
                # Create notification for client managers
                for manager in invoice.client.assigned_managers:
                    notification = Notification(
                        user_id=manager.user_id,
                        client_id=invoice.client_id,
                        type='overdue',
                        message=message,
                        status='pending'
                    )
                    db.session.add(notification)
                    notifications_created += 1
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'create_overdue_notifications', 
                       f"Created {notifications_created} overdue notifications")
        
        return jsonify({
            'message': f'Created {notifications_created} overdue notifications',
            'count': notifications_created
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create overdue notifications error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/types', methods=['GET'])
@login_required
@require_permission('Notifications', 'view')
def get_notification_types():
    """Get available notification types"""
    try:
        types = [
            {'value': 'overdue', 'label': 'Overdue Invoice'},
            {'value': 'invoice_ready', 'label': 'Invoice Ready'},
            {'value': 'system_alert', 'label': 'System Alert'}
        ]
        
        return jsonify({'types': types}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get notification types error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500