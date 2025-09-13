from celery import Celery
from app import create_app, db
from app.models import Invoice
from weasyprint import HTML, CSS
from jinja2 import Template
import os
from datetime import datetime

# Create Celery instance
celery = Celery('pdf_generator')

@celery.task(bind=True)
def generate_invoice_pdf(self, invoice_id):
    """Generate PDF for an invoice"""
    app = create_app()
    
    with app.app_context():
        try:
            invoice = Invoice.query.get(invoice_id)
            if not invoice:
                raise Exception(f"Invoice {invoice_id} not found")
            
            # Create PDF directory if it doesn't exist
            pdf_dir = os.path.join(app.config['UPLOAD_DIR'], 'invoices', 'pdfs')
            os.makedirs(pdf_dir, exist_ok=True)
            
            # Generate PDF filename
            pdf_filename = f"{invoice.invoice_number}.pdf"
            pdf_path = os.path.join(pdf_dir, pdf_filename)
            
            # HTML template for invoice
            html_template = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Invoice {{ invoice.invoice_number }}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
                    .invoice-title { font-size: 20px; margin: 20px 0; }
                    .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .client-info, .invoice-info { width: 45%; }
                    .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .table th { background-color: #f8f9fa; }
                    .totals { text-align: right; margin-top: 20px; }
                    .total-row { font-weight: bold; font-size: 16px; }
                    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">TejIT Solutions</div>
                    <div>AWS Cloud Services Provider</div>
                </div>
                
                <div class="invoice-title">INVOICE</div>
                
                <div class="invoice-details">
                    <div class="client-info">
                        <h3>Bill To:</h3>
                        <strong>{{ invoice.client.client_name }}</strong><br>
                        {{ invoice.client.contact_person }}<br>
                        {{ invoice.client.email }}<br>
                        {% if invoice.client.phone %}{{ invoice.client.phone }}<br>{% endif %}
                        {% if invoice.client.billing_address %}
                            {{ invoice.client.billing_address | replace('\n', '<br>') | safe }}
                        {% endif %}
                        {% if invoice.client.gst_number %}
                            <br><strong>GST Number:</strong> {{ invoice.client.gst_number }}
                        {% endif %}
                    </div>
                    
                    <div class="invoice-info">
                        <strong>Invoice Number:</strong> {{ invoice.invoice_number }}<br>
                        <strong>Invoice Date:</strong> {{ invoice.invoice_date.strftime('%B %d, %Y') }}<br>
                        <strong>Due Date:</strong> {{ invoice.due_date.strftime('%B %d, %Y') }}<br>
                        {% if invoice.usd_to_inr_rate %}
                            <strong>USD to INR Rate:</strong> {{ invoice.usd_to_inr_rate }}
                        {% endif %}
                    </div>
                </div>
                
                <table class="table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Rate</th>
                            <th>Discount</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for item in invoice.line_items %}
                        <tr>
                            <td>{{ item.description }}</td>
                            <td>{{ item.quantity }}</td>
                            <td>{{ item.currency.value }} {{ "%.4f"|format(item.rate) }}</td>
                            <td>{{ item.discount }}%</td>
                            <td>{{ item.currency.value }} {{ "%.2f"|format(item.calculate_amount()) }}</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div>Subtotal: {{ invoice.line_items[0].currency.value if invoice.line_items else 'USD' }} {{ "%.2f"|format(totals.subtotal) }}</div>
                    {% if invoice.gst_applicable %}
                        <div>GST (18%): {{ invoice.line_items[0].currency.value if invoice.line_items else 'USD' }} {{ "%.2f"|format(totals.gst_amount) }}</div>
                    {% endif %}
                    <div class="total-row">Total: {{ invoice.line_items[0].currency.value if invoice.line_items else 'USD' }} {{ "%.2f"|format(totals.total) }}</div>
                </div>
                
                {% if invoice.invoice_notes %}
                <div style="margin-top: 30px;">
                    <strong>Notes:</strong><br>
                    {{ invoice.invoice_notes | replace('\n', '<br>') | safe }}
                </div>
                {% endif %}
                
                <div class="footer">
                    <p>Thank you for your business!</p>
                    <p>This is a computer-generated invoice.</p>
                </div>
            </body>
            </html>
            """
            
            # Render template
            template = Template(html_template)
            totals = invoice.calculate_totals()
            html_content = template.render(invoice=invoice, totals=totals)
            
            # Generate PDF
            HTML(string=html_content).write_pdf(pdf_path)
            
            # Update invoice with PDF path
            invoice.pdf_path = pdf_path
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'PDF generated successfully for invoice {invoice.invoice_number}',
                'pdf_path': pdf_path
            }
            
        except Exception as e:
            db.session.rollback()
            return {
                'status': 'error',
                'message': f'Failed to generate PDF: {str(e)}'
            }

@celery.task(bind=True)
def generate_bulk_pdfs(self, invoice_ids):
    """Generate PDFs for multiple invoices"""
    app = create_app()
    
    with app.app_context():
        results = []
        
        for invoice_id in invoice_ids:
            try:
                result = generate_invoice_pdf.delay(invoice_id)
                results.append({
                    'invoice_id': invoice_id,
                    'task_id': result.id,
                    'status': 'queued'
                })
            except Exception as e:
                results.append({
                    'invoice_id': invoice_id,
                    'status': 'error',
                    'message': str(e)
                })
        
        return {
            'status': 'success',
            'message': f'Queued PDF generation for {len(invoice_ids)} invoices',
            'results': results
        }