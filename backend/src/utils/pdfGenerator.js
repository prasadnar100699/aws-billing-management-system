const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  async generateInvoicePDF(invoice, client, lineItems) {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `${invoice.invoice_number}.pdf`;
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const filepath = path.join(uploadDir, 'invoices', filename);

      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(filepath), { recursive: true });

      // Pipe PDF to file
      doc.pipe(fs.createWriteStream(filepath));

      // Header
      this.addHeader(doc, invoice, client);
      
      // Invoice details
      this.addInvoiceDetails(doc, invoice, client);
      
      // Line items table
      this.addLineItemsTable(doc, lineItems);
      
      // Totals
      this.addTotals(doc, invoice);
      
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
       .text('Email: billing@tejit.com', 50, 90);

    // Invoice title
    doc.fontSize(24)
       .text('INVOICE', 400, 50, { align: 'right' })
       .fontSize(12)
       .text(`Invoice #: ${invoice.invoice_number}`, 400, 80, { align: 'right' })
       .text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 400, 95, { align: 'right' });

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
      const amount = parseFloat(item.quantity) * parseFloat(item.rate) * (1 - parseFloat(item.discount || 0) / 100);
      
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
  }

  addTotals(doc, invoice) {
    const totalsX = 400;
    let yPosition = 500;

    doc.fontSize(12)
       .text('Subtotal:', totalsX, yPosition)
       .text(`${invoice.currency || 'USD'} ${invoice.subtotal || 0}`, totalsX + 100, yPosition, { align: 'right' });

    if (invoice.gst_amount > 0) {
      yPosition += 20;
      doc.text('GST (18%):', totalsX, yPosition)
         .text(`${invoice.currency || 'USD'} ${invoice.gst_amount}`, totalsX + 100, yPosition, { align: 'right' });
    }

    yPosition += 20;
    doc.fontSize(14)
       .text('Total:', totalsX, yPosition)
       .text(`${invoice.currency || 'USD'} ${invoice.total_amount || 0}`, totalsX + 100, yPosition, { align: 'right' });
  }

  addFooter(doc) {
    const footerY = 700;
    
    doc.fontSize(10)
       .text('Payment Terms: Net 30 days', 50, footerY)
       .text('Thank you for your business!', 50, footerY + 15);

    doc.text('Tej IT Solutions - AWS Client Billing & Management System', 50, footerY + 60, {
      align: 'center',
      width: 500
    });
  }
}

module.exports = new PDFGenerator();