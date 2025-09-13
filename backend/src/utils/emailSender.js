const nodemailer = require('nodemailer');

class EmailSender {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('Email configuration not complete. Email features will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
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
        from: `"Tej IT Solutions" <${process.env.SMTP_USER}>`,
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
}

module.exports = new EmailSender();