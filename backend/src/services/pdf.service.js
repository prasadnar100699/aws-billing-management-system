const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

class PDFService {
  async generateInvoicePDF(invoice, client, lineItems) {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `${invoice.invoice_number}.pdf`;
      const filepath = path.join(config.UPLOAD_DIR, 'invoices', filename);

      // Ensure directory exists
      await require('fs').promises.mkdir(path.dirname(filepath), { recursive: true });

      // Pipe PDF to file
      doc.pipe(fs.createWriteStream(filepath));

      // Header
      this.addHeader(doc, invoice, client);
      
      // Invoice details
      this.addInvoiceDetails(doc, invoice, client);
      
      // Line items table
      this.addLineItemsTable(doc, lineItems);
      
      // Totals
      const totals = await invoice.calculateTotals();
      this.addTotals(doc, totals, invoice);
      
      // Footer
      this.addFooter(doc);

      // Finalize PDF
      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          resolve(filepath);
        });
        doc.on('error', reject);
      });
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  addHeader(doc, invoice, client) {
    // Company logo and info
    doc.fontSize(20)
       .text('Tej IT Solutions', 50, 50)
       .fontSize(10)
       .text('AWS Client Billing & Management', 50, 75)
       .text('Email: billing@tejit.com', 50, 90)
       .text('Phone: +91-XXXXX-XXXXX', 50, 105);

    // Invoice title
    doc.fontSize(24)
       .text('INVOICE', 400, 50, { align: 'right' })
       .fontSize(12)
       .text(`Invoice #: ${invoice.invoice_number}`, 400, 80, { align: 'right' })
       .text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 400, 95, { align: 'right' })
       .text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 400, 110, { align: 'right' });

    // Line separator
    doc.moveTo(50, 140)
       .lineTo(550, 140)
       .stroke();
  }

  addInvoiceDetails(doc, invoice, client) {
    let yPosition = 160;

    // Bill to section
    doc.fontSize(14)
       .text('Bill To:', 50, yPosition)
       .fontSize(12)
       .text(client.client_name, 50, yPosition + 20)
       .text(client.contact_person || '', 50, yPosition + 35)
       .text(client.email, 50, yPosition + 50);

    if (client.billing_address) {
      const addressLines = client.billing_address.split('\n');
      addressLines.forEach((line, index) => {
        doc.text(line, 50, yPosition + 65 + (index * 15));
      });
    }

    // GST information
    if (client.gst_registered && client.gst_number) {
      doc.text(`GST Number: ${client.gst_number}`, 50, yPosition + 120);
    }

    // Invoice details
    doc.fontSize(12)
       .text(`Billing Period: ${new Date(invoice.billing_period_start || invoice.invoice_date).toLocaleDateString()} - ${new Date(invoice.billing_period_end || invoice.due_date).toLocaleDateString()}`, 300, yPosition + 20)
       .text(`Currency: ${invoice.currency}`, 300, yPosition + 35);

    if (invoice.usd_to_inr_rate) {
      doc.text(`Exchange Rate: 1 USD = ${invoice.usd_to_inr_rate} INR`, 300, yPosition + 50);
    }
  }

  addLineItemsTable(doc, lineItems) {
    const tableTop = 280;
    const itemCodeX = 50;
    const descriptionX = 150;
    const quantityX = 350;
    const rateX = 400;
    const amountX = 480;

    // Table header
    doc.fontSize(12)
       .text('Item', itemCodeX, tableTop)
       .text('Description', descriptionX, tableTop)
       .text('Qty', quantityX, tableTop)
       .text('Rate', rateX, tableTop)
       .text('Amount', amountX, tableTop);

    // Header line
    doc.moveTo(itemCodeX, tableTop + 15)
       .lineTo(550, tableTop + 15)
       .stroke();

    let yPosition = tableTop + 30;

    // Line items
    lineItems.forEach((item, index) => {
      const amount = item.calculateAmount();
      
      doc.fontSize(10)
         .text((index + 1).toString(), itemCodeX, yPosition)
         .text(item.description, descriptionX, yPosition, { width: 180 })
         .text(item.quantity.toString(), quantityX, yPosition)
         .text(`${item.currency} ${parseFloat(item.rate).toFixed(4)}`, rateX, yPosition)
         .text(`${item.currency} ${amount.toFixed(2)}`, amountX, yPosition);

      yPosition += 25;
    });

    // Bottom line
    doc.moveTo(itemCodeX, yPosition)
       .lineTo(550, yPosition)
       .stroke();

    return yPosition + 20;
  }

  addTotals(doc, totals, invoice) {
    const totalsX = 400;
    let yPosition = 500;

    doc.fontSize(12)
       .text('Subtotal:', totalsX, yPosition)
       .text(`${invoice.currency} ${totals.subtotal.toFixed(2)}`, totalsX + 100, yPosition, { align: 'right' });

    if (totals.gst_amount > 0) {
      yPosition += 20;
      doc.text('GST (18%):', totalsX, yPosition)
         .text(`${invoice.currency} ${totals.gst_amount.toFixed(2)}`, totalsX + 100, yPosition, { align: 'right' });
    }

    yPosition += 20;
    doc.fontSize(14)
       .text('Total:', totalsX, yPosition)
       .text(`${invoice.currency} ${totals.total.toFixed(2)}`, totalsX + 100, yPosition, { align: 'right' });

    // Total line
    doc.moveTo(totalsX, yPosition + 15)
       .lineTo(550, yPosition + 15)
       .stroke();
  }

  addFooter(doc) {
    const footerY = 700;
    
    doc.fontSize(10)
       .text('Payment Terms: Net 30 days', 50, footerY)
       .text('Thank you for your business!', 50, footerY + 15)
       .text('For any queries, contact us at billing@tejit.com', 50, footerY + 30);

    // Company footer
    doc.text('Tej IT Solutions - AWS Client Billing & Management System', 50, footerY + 60, {
      align: 'center',
      width: 500
    });
  }
}

module.exports = new PDFService();