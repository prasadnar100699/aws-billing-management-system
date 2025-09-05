from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from flask import current_app
import os
from datetime import datetime

def generate_invoice_pdf(invoice, output_path):
    """Generate PDF for an invoice."""
    doc = SimpleDocTemplate(output_path, pagesize=A4)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=colors.HexColor('#2c3e50')
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        textColor=colors.HexColor('#34495e')
    )
    
    # Build PDF content
    story = []
    
    # Company Header
    story.append(Paragraph(current_app.config['COMPANY_NAME'], title_style))
    story.append(Paragraph(current_app.config['COMPANY_ADDRESS'], styles['Normal']))
    story.append(Paragraph(f"GST: {current_app.config['COMPANY_GST']}", styles['Normal']))
    story.append(Paragraph(f"Email: {current_app.config['COMPANY_EMAIL']}", styles['Normal']))
    story.append(Paragraph(f"Phone: {current_app.config['COMPANY_PHONE']}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Invoice Header
    story.append(Paragraph("INVOICE", title_style))
    story.append(Spacer(1, 12))
    
    # Invoice Details Table
    invoice_details = [
        ['Invoice Number:', invoice.invoice_number],
        ['Invoice Date:', invoice.invoice_date.strftime('%B %d, %Y')],
        ['Due Date:', invoice.due_date.strftime('%B %d, %Y')],
        ['Status:', invoice.status]
    ]
    
    if invoice.exchange_rate:
        invoice_details.append(['Exchange Rate (USD/INR):', f"₹{invoice.exchange_rate}"])
    
    invoice_table = Table(invoice_details, colWidths=[2*inch, 3*inch])
    invoice_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    story.append(invoice_table)
    story.append(Spacer(1, 20))
    
    # Client Details
    story.append(Paragraph("Bill To:", header_style))
    story.append(Paragraph(invoice.client.name, styles['Normal']))
    if invoice.client.company_name:
        story.append(Paragraph(invoice.client.company_name, styles['Normal']))
    story.append(Paragraph(invoice.client.full_address, styles['Normal']))
    story.append(Paragraph(f"Email: {invoice.client.email}", styles['Normal']))
    if invoice.client.gst_number:
        story.append(Paragraph(f"GST: {invoice.client.gst_number}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Line Items Table
    story.append(Paragraph("Services/Items:", header_style))
    
    # Table headers
    headers = ['Description', 'Qty', 'Unit', 'Rate', 'Amount']
    table_data = [headers]
    
    # Add line items
    for item in invoice.line_items:
        if invoice.currency == 'USD':
            rate = f"${item.usd_rate}" if item.usd_rate else '-'
            amount = f"${item.usd_amount}" if item.usd_amount else '-'
        else:
            rate = f"₹{item.inr_rate}" if item.inr_rate else '-'
            amount = f"₹{item.inr_amount}" if item.inr_amount else '-'
        
        table_data.append([
            item.description,
            str(item.quantity),
            item.unit,
            rate,
            amount
        ])
    
    # Create table
    items_table = Table(table_data, colWidths=[3*inch, 0.8*inch, 0.8*inch, 1.2*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),  # Right align numbers
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#bdc3c7')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')])
    ]))
    
    story.append(items_table)
    story.append(Spacer(1, 20))
    
    # Totals Table
    currency_symbol = '$' if invoice.currency == 'USD' else '₹'
    subtotal = invoice.subtotal_usd if invoice.currency == 'USD' else invoice.subtotal_inr
    
    totals_data = [
        ['Subtotal:', f'{currency_symbol}{subtotal}']
    ]
    
    if invoice.gst_applicable:
        totals_data.append([f'GST ({invoice.gst_rate}%):', f'{currency_symbol}{invoice.gst_amount}'])
    
    totals_data.append(['Total Amount:', f'{currency_symbol}{invoice.total_amount}'])
    
    totals_table = Table(totals_data, colWidths=[4*inch, 2*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#34495e')),
    ]))
    
    story.append(totals_table)
    story.append(Spacer(1, 30))
    
    # Payment Instructions
    story.append(Paragraph("Payment Instructions:", header_style))
    story.append(Paragraph(f"Payment is due within {invoice.client.payment_terms} days of invoice date.", styles['Normal']))
    story.append(Paragraph("Please include the invoice number in your payment reference.", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Footer
    story.append(Paragraph("Thank you for your business!", styles['Normal']))
    
    # Build PDF
    doc.build(story)
    return output_path

def generate_payment_receipt(payment, output_path):
    """Generate PDF receipt for a payment."""
    doc = SimpleDocTemplate(output_path, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    
    # Header
    story.append(Paragraph("PAYMENT RECEIPT", styles['Title']))
    story.append(Spacer(1, 20))
    
    # Company details
    story.append(Paragraph(current_app.config['COMPANY_NAME'], styles['Heading2']))
    story.append(Paragraph(current_app.config['COMPANY_ADDRESS'], styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Payment details
    payment_data = [
        ['Receipt Number:', f"REC-{payment.id:06d}"],
        ['Payment Date:', payment.payment_date.strftime('%B %d, %Y')],
        ['Amount Received:', f"{payment.currency} {payment.amount}"],
        ['Payment Method:', payment.payment_method],
        ['Client:', payment.client.name],
        ['Invoice Number:', payment.invoice.invoice_number if payment.invoice else 'General Payment']
    ]
    
    if payment.transaction_id:
        payment_data.append(['Transaction ID:', payment.transaction_id])
    
    payment_table = Table(payment_data, colWidths=[2*inch, 4*inch])
    payment_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    story.append(payment_table)
    story.append(Spacer(1, 30))
    
    # Thank you message
    story.append(Paragraph("Thank you for your payment!", styles['Normal']))
    
    doc.build(story)
    return output_path