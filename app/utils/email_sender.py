from flask import current_app, render_template
from flask_mail import Message
from app import mail, db
from app.models.email_logs import EmailLog
import os

def send_invoice_email(invoice, recipient_email=None):
    """Send invoice via email."""
    if not recipient_email:
        recipient_email = invoice.client.email
    
    try:
        # Create email message
        msg = Message(
            subject=f'Invoice {invoice.invoice_number} from {current_app.config["COMPANY_NAME"]}',
            recipients=[recipient_email],
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
        
        # Email body
        msg.html = render_template(
            'emails/invoice.html',
            invoice=invoice,
            company_name=current_app.config['COMPANY_NAME']
        )
        
        msg.body = render_template(
            'emails/invoice.txt',
            invoice=invoice,
            company_name=current_app.config['COMPANY_NAME']
        )
        
        # Attach PDF if it exists
        if invoice.pdf_path and os.path.exists(invoice.pdf_path):
            with current_app.open_resource(invoice.pdf_path) as fp:
                msg.attach(
                    f"Invoice_{invoice.invoice_number}.pdf",
                    "application/pdf",
                    fp.read()
                )
        
        # Send email
        mail.send(msg)
        
        # Log successful email
        email_log = EmailLog(
            to_email=recipient_email,
            from_email=current_app.config['MAIL_DEFAULT_SENDER'][1],
            subject=msg.subject,
            email_type='invoice',
            invoice_id=invoice.id,
            client_id=invoice.client_id,
            status='sent'
        )
        email_log.mark_sent()
        
        db.session.add(email_log)
        db.session.commit()
        
        return True, "Email sent successfully"
        
    except Exception as e:
        # Log failed email
        email_log = EmailLog(
            to_email=recipient_email,
            from_email=current_app.config['MAIL_DEFAULT_SENDER'][1],
            subject=f'Invoice {invoice.invoice_number}',
            email_type='invoice',
            invoice_id=invoice.id,
            client_id=invoice.client_id,
            status='failed',
            error_message=str(e)
        )
        
        db.session.add(email_log)
        db.session.commit()
        
        return False, f"Failed to send email: {str(e)}"

def send_payment_reminder(invoice, recipient_email=None):
    """Send payment reminder email."""
    if not recipient_email:
        recipient_email = invoice.client.email
    
    try:
        msg = Message(
            subject=f'Payment Reminder - Invoice {invoice.invoice_number}',
            recipients=[recipient_email],
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
        
        msg.html = render_template(
            'emails/payment_reminder.html',
            invoice=invoice,
            company_name=current_app.config['COMPANY_NAME']
        )
        
        msg.body = render_template(
            'emails/payment_reminder.txt',
            invoice=invoice,
            company_name=current_app.config['COMPANY_NAME']
        )
        
        mail.send(msg)
        
        # Log email
        email_log = EmailLog(
            to_email=recipient_email,
            from_email=current_app.config['MAIL_DEFAULT_SENDER'][1],
            subject=msg.subject,
            email_type='payment_reminder',
            invoice_id=invoice.id,
            client_id=invoice.client_id,
            status='sent'
        )
        email_log.mark_sent()
        
        db.session.add(email_log)
        db.session.commit()
        
        return True, "Reminder sent successfully"
        
    except Exception as e:
        return False, f"Failed to send reminder: {str(e)}"

def send_notification_email(user, subject, template, **kwargs):
    """Send notification email to user."""
    try:
        msg = Message(
            subject=subject,
            recipients=[user.email],
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
        
        msg.html = render_template(f'emails/{template}.html', user=user, **kwargs)
        msg.body = render_template(f'emails/{template}.txt', user=user, **kwargs)
        
        mail.send(msg)
        
        # Log email
        email_log = EmailLog(
            to_email=user.email,
            from_email=current_app.config['MAIL_DEFAULT_SENDER'][1],
            subject=subject,
            email_type='notification',
            user_id=user.id,
            status='sent'
        )
        email_log.mark_sent()
        
        db.session.add(email_log)
        db.session.commit()
        
        return True, "Notification sent"
        
    except Exception as e:
        return False, f"Failed to send notification: {str(e)}"