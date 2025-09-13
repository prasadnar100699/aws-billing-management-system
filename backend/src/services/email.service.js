const nodemailer = require('nodemailer');
const config = require('../config/env');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASSWORD) {
      console.warn('Email configuration not complete. Email features will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD
      }
    });
  }

  async sendEmail(to, subject, html, attachments = []) {
    if (!this.transporter) {
      console.warn('Email transporter not configured. Skipping email send.');
      return { success: false, message: 'Email not configured' };
    }

    try {
      const mailOptions = {
        from: `"Tej IT Solutions" <${config.SMTP_USER}>`,
        to,
        subject,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendInvoiceEmail(invoice, client, pdfPath) {
    const subject = `Invoice ${invoice.invoice_number} - Tej IT Solutions`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Invoice ${invoice.invoice_number}</h2>
        <p>Dear ${client.contact_person || client.client_name},</p>
        <p>Please find attached your invoice for the billing period.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Invoice Details</h3>
          <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
          <p><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
          <p><strong>Amount:</strong> ${invoice.currency} ${invoice.total_amount}</p>
        </div>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>Tej IT Solutions Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated email. Please do not reply to this email.
        </p>
      </div>
    `;

    const attachments = [];
    if (pdfPath) {
      attachments.push({
        filename: `${invoice.invoice_number}.pdf`,
        path: pdfPath
      });
    }

    return await this.sendEmail(client.email, subject, html, attachments);
  }

  async sendNotificationEmail(user, notification) {
    const subject = `Notification: ${notification.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${notification.title}</h2>
        <p>Dear ${user.username},</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${notification.message}
        </div>
        <p>Best regards,<br>Tej IT Solutions Team</p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }
}

module.exports = new EmailService();