from celery import Celery
from app import create_app
import pandas as pd
import openpyxl
from weasyprint import HTML
import tempfile
import os
import json
from datetime import datetime

# Create Celery instance
celery = Celery('report_generator')

@celery.task(bind=True)
def generate_report_export(self, report_type, export_format, report_data):
    """Generate report export in various formats"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create temporary file
            temp_dir = tempfile.mkdtemp()
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            if export_format.lower() == 'csv':
                return generate_csv_export(report_type, report_data, temp_dir, timestamp)
            elif export_format.lower() == 'excel':
                return generate_excel_export(report_type, report_data, temp_dir, timestamp)
            elif export_format.lower() == 'pdf':
                return generate_pdf_export(report_type, report_data, temp_dir, timestamp)
            else:
                raise Exception(f"Unsupported export format: {export_format}")
                
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to generate report export: {str(e)}'
            }

def generate_csv_export(report_type, report_data, temp_dir, timestamp):
    """Generate CSV export"""
    try:
        filename = f"{report_type}_report_{timestamp}.csv"
        file_path = os.path.join(temp_dir, filename)
        
        if report_type == 'clients':
            # Convert client report data to DataFrame
            df = pd.DataFrame(report_data)
            df.to_csv(file_path, index=False)
            
        elif report_type == 'services':
            # Convert service report data to DataFrame
            df = pd.DataFrame(report_data)
            df.to_csv(file_path, index=False)
            
        elif report_type == 'revenue':
            # Convert revenue trend data to DataFrame
            df = pd.DataFrame({
                'Period': report_data['labels'],
                'Revenue': report_data['revenue_data'],
                'Invoice Count': report_data['invoice_counts'],
                'Client Count': report_data['client_counts']
            })
            df.to_csv(file_path, index=False)
            
        elif report_type == 'aging':
            # Convert aging report data to DataFrame
            all_invoices = []
            for bucket, invoices in report_data['aging_buckets'].items():
                for invoice in invoices:
                    invoice['aging_bucket'] = bucket
                    all_invoices.append(invoice)
            
            df = pd.DataFrame(all_invoices)
            df.to_csv(file_path, index=False)
        
        return {
            'status': 'success',
            'message': 'CSV export generated successfully',
            'file_path': file_path,
            'filename': filename
        }
        
    except Exception as e:
        raise Exception(f"CSV export failed: {str(e)}")

def generate_excel_export(report_type, report_data, temp_dir, timestamp):
    """Generate Excel export"""
    try:
        filename = f"{report_type}_report_{timestamp}.xlsx"
        file_path = os.path.join(temp_dir, filename)
        
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            if report_type == 'clients':
                df = pd.DataFrame(report_data)
                df.to_excel(writer, sheet_name='Client Report', index=False)
                
            elif report_type == 'services':
                df = pd.DataFrame(report_data)
                df.to_excel(writer, sheet_name='Service Report', index=False)
                
            elif report_type == 'revenue':
                # Revenue trend sheet
                df_trend = pd.DataFrame({
                    'Period': report_data['labels'],
                    'Revenue': report_data['revenue_data'],
                    'Invoice Count': report_data['invoice_counts'],
                    'Client Count': report_data['client_counts']
                })
                df_trend.to_excel(writer, sheet_name='Revenue Trend', index=False)
                
                # Summary sheet
                summary_data = {
                    'Metric': ['Total Revenue', 'Total Invoices', 'Average Revenue per Period'],
                    'Value': [
                        report_data['total_revenue'],
                        report_data['total_invoices'],
                        report_data['avg_revenue_per_period']
                    ]
                }
                df_summary = pd.DataFrame(summary_data)
                df_summary.to_excel(writer, sheet_name='Summary', index=False)
                
            elif report_type == 'aging':
                # Create separate sheets for each aging bucket
                for bucket, invoices in report_data['aging_buckets'].items():
                    if invoices:
                        df = pd.DataFrame(invoices)
                        df.to_excel(writer, sheet_name=f'Aging {bucket} Days', index=False)
                
                # Summary sheet
                summary_data = []
                for bucket, total in report_data['totals'].items():
                    summary_data.append({
                        'Aging Bucket': f'{bucket} Days',
                        'Invoice Count': total['count'],
                        'Total Amount': total['amount']
                    })
                
                df_summary = pd.DataFrame(summary_data)
                df_summary.to_excel(writer, sheet_name='Summary', index=False)
        
        return {
            'status': 'success',
            'message': 'Excel export generated successfully',
            'file_path': file_path,
            'filename': filename
        }
        
    except Exception as e:
        raise Exception(f"Excel export failed: {str(e)}")

def generate_pdf_export(report_type, report_data, temp_dir, timestamp):
    """Generate PDF export"""
    try:
        filename = f"{report_type}_report_{timestamp}.pdf"
        file_path = os.path.join(temp_dir, filename)
        
        # Generate HTML content based on report type
        if report_type == 'clients':
            html_content = generate_client_report_html(report_data)
        elif report_type == 'services':
            html_content = generate_service_report_html(report_data)
        elif report_type == 'revenue':
            html_content = generate_revenue_report_html(report_data)
        elif report_type == 'aging':
            html_content = generate_aging_report_html(report_data)
        else:
            raise Exception(f"Unsupported report type for PDF: {report_type}")
        
        # Generate PDF
        HTML(string=html_content).write_pdf(file_path)
        
        return {
            'status': 'success',
            'message': 'PDF export generated successfully',
            'file_path': file_path,
            'filename': filename
        }
        
    except Exception as e:
        raise Exception(f"PDF export failed: {str(e)}")

def generate_client_report_html(report_data):
    """Generate HTML for client report"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Client Revenue Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
            .report-title { font-size: 20px; margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f8f9fa; }
            .total-row { font-weight: bold; background-color: #e9ecef; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">TejIT Solutions</div>
            <div class="report-title">Client Revenue Report</div>
            <div>Generated on: """ + datetime.now().strftime('%B %d, %Y at %I:%M %p') + """</div>
        </div>
        
        <table class="table">
            <thead>
                <tr>
                    <th>Client Name</th>
                    <th>Total Invoices</th>
                    <th>Total Revenue</th>
                    <th>Average Invoice Amount</th>
                </tr>
            </thead>
            <tbody>
    """
    
    total_revenue = 0
    total_invoices = 0
    
    for client in report_data:
        html += f"""
                <tr>
                    <td>{client['client_name']}</td>
                    <td>{client['total_invoices']}</td>
                    <td>${client['total_revenue']:,.2f}</td>
                    <td>${client['avg_invoice_amount']:,.2f}</td>
                </tr>
        """
        total_revenue += client['total_revenue']
        total_invoices += client['total_invoices']
    
    html += f"""
                <tr class="total-row">
                    <td>TOTAL</td>
                    <td>{total_invoices}</td>
                    <td>${total_revenue:,.2f}</td>
                    <td>${total_revenue/len(report_data) if report_data else 0:,.2f}</td>
                </tr>
            </tbody>
        </table>
    </body>
    </html>
    """
    
    return html

def generate_service_report_html(report_data):
    """Generate HTML for service report"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Service Usage Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
            .report-title { font-size: 20px; margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f8f9fa; }
            .total-row { font-weight: bold; background-color: #e9ecef; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">TejIT Solutions</div>
            <div class="report-title">Service Usage Report</div>
            <div>Generated on: """ + datetime.now().strftime('%B %d, %Y at %I:%M %p') + """</div>
        </div>
        
        <table class="table">
            <thead>
                <tr>
                    <th>Service Name</th>
                    <th>Component</th>
                    <th>Total Quantity</th>
                    <th>Total Revenue</th>
                    <th>Unique Clients</th>
                </tr>
            </thead>
            <tbody>
    """
    
    total_revenue = 0
    
    for service in report_data:
        html += f"""
                <tr>
                    <td>{service['service_name']}</td>
                    <td>{service['component_name']}</td>
                    <td>{service['total_quantity']:,.2f}</td>
                    <td>${service['total_revenue']:,.2f}</td>
                    <td>{service['unique_clients']}</td>
                </tr>
        """
        total_revenue += service['total_revenue']
    
    html += f"""
                <tr class="total-row">
                    <td colspan="3">TOTAL</td>
                    <td>${total_revenue:,.2f}</td>
                    <td>-</td>
                </tr>
            </tbody>
        </table>
    </body>
    </html>
    """
    
    return html

def generate_revenue_report_html(report_data):
    """Generate HTML for revenue report"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Revenue Trend Report</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .company-name {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
            .report-title {{ font-size: 20px; margin: 20px 0; }}
            .summary {{ margin-bottom: 30px; }}
            .summary-item {{ margin: 10px 0; font-size: 16px; }}
            .table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
            .table th, .table td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            .table th {{ background-color: #f8f9fa; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">TejIT Solutions</div>
            <div class="report-title">Revenue Trend Report</div>
            <div>Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</div>
        </div>
        
        <div class="summary">
            <div class="summary-item"><strong>Total Revenue:</strong> ${report_data['total_revenue']:,.2f}</div>
            <div class="summary-item"><strong>Total Invoices:</strong> {report_data['total_invoices']:,}</div>
            <div class="summary-item"><strong>Average Revenue per Period:</strong> ${report_data['avg_revenue_per_period']:,.2f}</div>
        </div>
        
        <table class="table">
            <thead>
                <tr>
                    <th>Period</th>
                    <th>Revenue</th>
                    <th>Invoice Count</th>
                    <th>Client Count</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for i, period in enumerate(report_data['labels']):
        html += f"""
                <tr>
                    <td>{period}</td>
                    <td>${report_data['revenue_data'][i]:,.2f}</td>
                    <td>{report_data['invoice_counts'][i]}</td>
                    <td>{report_data['client_counts'][i]}</td>
                </tr>
        """
    
    html += """
            </tbody>
        </table>
    </body>
    </html>
    """
    
    return html

def generate_aging_report_html(report_data):
    """Generate HTML for aging report"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice Aging Report</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .company-name {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
            .report-title {{ font-size: 20px; margin: 20px 0; }}
            .summary {{ margin-bottom: 30px; }}
            .summary-item {{ margin: 10px 0; font-size: 16px; }}
            .bucket {{ margin-bottom: 30px; }}
            .bucket-title {{ font-size: 18px; font-weight: bold; margin-bottom: 10px; }}
            .table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
            .table th, .table td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            .table th {{ background-color: #f8f9fa; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">TejIT Solutions</div>
            <div class="report-title">Invoice Aging Report</div>
            <div>Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</div>
        </div>
        
        <div class="summary">
            <div class="summary-item"><strong>Total Overdue Amount:</strong> ${report_data['total_overdue_amount']:,.2f}</div>
            <div class="summary-item"><strong>Total Overdue Invoices:</strong> {report_data['total_overdue_count']:,}</div>
        </div>
    """
    
    for bucket, invoices in report_data['aging_buckets'].items():
        if invoices:
            html += f"""
        <div class="bucket">
            <div class="bucket-title">{bucket} Days Overdue ({len(invoices)} invoices)</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Invoice Number</th>
                        <th>Client Name</th>
                        <th>Invoice Date</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Days Overdue</th>
                    </tr>
                </thead>
                <tbody>
            """
            
            for invoice in invoices:
                html += f"""
                    <tr>
                        <td>{invoice['invoice_number']}</td>
                        <td>{invoice['client_name']}</td>
                        <td>{invoice['invoice_date']}</td>
                        <td>{invoice['due_date']}</td>
                        <td>${invoice['amount']:,.2f}</td>
                        <td>{invoice['days_overdue']}</td>
                    </tr>
                """
            
            html += """
                </tbody>
            </table>
        </div>
            """
    
    html += """
    </body>
    </html>
    """
    
    return html