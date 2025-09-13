from celery import Celery
from flask_mail import Message
from app import create_app, db, mail
from app.models import Invoice, Notification, User
import os
from datetime import datetime

# Create Celery instance
celery = Celery('email_sender')

@celery.task(bind=True, max_retries=3)
def send_invoice_email(self, invoice_id, email_to, email_subject, email_body):
    """Send invoice via email"""
    app = create_app()
    
    with app.app_context():
        try:
            invoice = Invoice.query.get(invoice_id)
            if not invoice:
                raise Exception(f"Invoice {invoice_id} not found")
            
            # Create email message
            msg = Message(
                subject=email_subject,
                sender=app.config['MAIL_USERNAME'],
                recipients=[email_to]
            )
            
            msg.body = email_body
            
            # Attach PDF if available
            if invoice.pdf_path and os.path.exists(invoice.pdf_path):
                with open(invoice.pdf_path, 'rb') as f:
                    msg.attach(
                        f"{invoice.invoice_number}.pdf",
                        "application/pdf",
                        f.read()
                    )
            
            # Send email
            mail.send(msg)
            
            return {
                'status': 'success',
                'message': f'Invoice {invoice.invoice_number} sent successfully to {email_to}'
            }
            
        except Exception as e:
            # Retry logic
            if self.request.retries < self.max_retries:
                raise self.retry(countdown=60 * (self.request.retries + 1))
            
            return {
                'status': 'error',
                'message': f'Failed to send invoice email after {self.max_retries} retries: {str(e)}'
            }

@celery.task(bind=True, max_retries=3)
def send_notification_email(self, notification_id):
    """Send notification via email"""
    app = create_app()
    
    with app.app_context():
        try:
            notification = Notification.query.get(notification_id)
            if not notification:
                raise Exception(f"Notification {notification_id} not found")
            
            if not notification.user:
                raise Exception("Notification has no associated user")
            
            # Create email message
            msg = Message(
                subject=f"TejIT Notification: {notification.type.value.replace('_', ' ').title()}",
                sender=app.config['MAIL_USERNAME'],
                recipients=[notification.user.email]
            )
            
            msg.body = f"""
Dear {notification.user.username},

{notification.message}

Best regards,
TejIT Solutions Team

---
This is an automated notification from the AWS Billing Management System.
            """
            
            # Send email
            mail.send(msg)
            
            # Update notification status
            notification.status = 'sent'
            notification.sent_at = datetime.utcnow()
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Notification sent successfully to {notification.user.email}'
            }
            
        except Exception as e:
            db.session.rollback()
            
            # Update retry count
            notification = Notification.query.get(notification_id)
            if notification:
                notification.retry_count += 1
                db.session.commit()
            
            # Retry logic
            if self.request.retries < self.max_retries:
                raise self.retry(countdown=60 * (self.request.retries + 1))
            
            # Mark as failed after max retries
            if notification:
                notification.status = 'failed'
                db.session.commit()
            
            return {
                'status': 'error',
                'message': f'Failed to send notification email after {self.max_retries} retries: {str(e)}'
            }

@celery.task(bind=True)
def send_overdue_reminders(self):
    """Send overdue invoice reminders"""
    app = create_app()
    
    with app.app_context():
        try:
            from datetime import date
            
            # Find overdue invoices
            today = date.today()
            overdue_invoices = Invoice.query.filter(
                Invoice.due_date < today,
                Invoice.status.in_(['finalized', 'sent'])
            ).all()
            
            sent_count = 0
            
            for invoice in overdue_invoices:
                days_overdue = (today - invoice.due_date).days
                
                # Send reminder to client
                msg = Message(
                    subject=f"Overdue Invoice Reminder: {invoice.invoice_number}",
                    sender=app.config['MAIL_USERNAME'],
                    recipients=[invoice.client.email]
                )
                
                msg.body = f"""
Dear {invoice.client.contact_person or invoice.client.client_name},

This is a reminder that your invoice {invoice.invoice_number} is {days_overdue} days overdue.

Invoice Details:
- Invoice Number: {invoice.invoice_number}
- Invoice Date: {invoice.invoice_date.strftime('%B %d, %Y')}
- Due Date: {invoice.due_date.strftime('%B %d, %Y')}
- Amount: ${invoice.calculate_totals()['total']:.2f}

Please arrange for payment at your earliest convenience.

Best regards,
TejIT Solutions Team
                """
                
                # Attach PDF if available
                if invoice.pdf_path and os.path.exists(invoice.pdf_path):
                    with open(invoice.pdf_path, 'rb') as f:
                        msg.attach(
                            f"{invoice.invoice_number}.pdf",
                            "application/pdf",
                            f.read()
                        )
                
                mail.send(msg)
                sent_count += 1
            
            return {
                'status': 'success',
                'message': f'Sent {sent_count} overdue reminders'
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to send overdue reminders: {str(e)}'
            }

@celery.task(bind=True)
def send_bulk_emails(self, email_data_list):
    """Send multiple emails"""
    app = create_app()
    
    with app.app_context():
        results = []
        
        for email_data in email_data_list:
            try:
                msg = Message(
                    subject=email_data['subject'],
                    sender=app.config['MAIL_USERNAME'],
                    recipients=email_data['recipients']
                )
                
                msg.body = email_data['body']
                
                # Add attachments if provided
                if 'attachments' in email_data:
                    for attachment in email_data['attachments']:
                        if os.path.exists(attachment['path']):
                            with open(attachment['path'], 'rb') as f:
                                msg.attach(
                                    attachment['filename'],
                                    attachment['content_type'],
                                    f.read()
                                )
                
                mail.send(msg)
                
                results.append({
                    'recipients': email_data['recipients'],
                    'status': 'success'
                })
                
            except Exception as e:
                results.append({
                    'recipients': email_data['recipients'],
                    'status': 'error',
                    'message': str(e)
                })
        
        return {
            'status': 'success',
            'message': f'Processed {len(email_data_list)} emails',
            'results': results
        }