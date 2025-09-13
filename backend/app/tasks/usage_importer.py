from celery import Celery
from app import create_app, db
from app.models import UsageImport, Client, Service, PricingComponent, Invoice, InvoiceLineItem
import pandas as pd
import csv
from datetime import datetime
import os

# Create Celery instance
celery = Celery('usage_importer')

@celery.task(bind=True)
def process_usage_import(self, import_id):
    """Process AWS usage import from CSV file"""
    app = create_app()
    
    with app.app_context():
        try:
            usage_import = UsageImport.query.get(import_id)
            if not usage_import:
                raise Exception(f"Usage import {import_id} not found")
            
            if not os.path.exists(usage_import.file_path):
                raise Exception(f"Import file not found: {usage_import.file_path}")
            
            # Update status to processing
            usage_import.status = 'processing'
            db.session.commit()
            
            # Read CSV file
            df = pd.read_csv(usage_import.file_path)
            usage_import.total_lines = len(df)
            db.session.commit()
            
            # Expected CSV columns for AWS CUR
            required_columns = [
                'lineItem/UsageAccountId',
                'product/servicecode',
                'lineItem/ProductCode',
                'lineItem/UsageType',
                'lineItem/Operation',
                'lineItem/UsageAmount',
                'lineItem/UnblendedRate',
                'lineItem/UnblendedCost',
                'lineItem/UsageStartDate',
                'lineItem/UsageEndDate'
            ]
            
            # Check if required columns exist
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise Exception(f"Missing required columns: {', '.join(missing_columns)}")
            
            # Get client AWS account mappings
            client = usage_import.client
            client_aws_accounts = client.get_aws_account_ids()
            
            # Filter data for client's AWS accounts
            df_filtered = df[df['lineItem/UsageAccountId'].isin(client_aws_accounts)]
            
            if df_filtered.empty:
                raise Exception("No usage data found for client's AWS accounts")
            
            # Group by service and usage type
            grouped_data = df_filtered.groupby([
                'product/servicecode',
                'lineItem/UsageType',
                'lineItem/Operation'
            ]).agg({
                'lineItem/UsageAmount': 'sum',
                'lineItem/UnblendedCost': 'sum',
                'lineItem/UnblendedRate': 'mean'
            }).reset_index()
            
            # Create draft invoice for this import
            invoice = Invoice(
                client_id=client.client_id,
                invoice_notes=f"Auto-generated from usage import {import_id}",
                status='draft'
            )
            invoice.generate_invoice_number()
            db.session.add(invoice)
            db.session.flush()
            
            processed_lines = 0
            errors = []
            
            # Process each grouped usage record
            for _, row in grouped_data.iterrows():
                try:
                    aws_service_code = row['product/servicecode']
                    usage_type = row['lineItem/UsageType']
                    operation = row['lineItem/Operation']
                    usage_amount = row['lineItem/UsageAmount']
                    unblended_cost = row['lineItem/UnblendedCost']
                    unblended_rate = row['lineItem/UnblendedRate']
                    
                    # Find matching service and pricing component
                    service = Service.query.filter_by(aws_service_code=aws_service_code).first()
                    
                    if not service:
                        # Create a generic line item for unmapped services
                        description = f"{aws_service_code} - {usage_type} ({operation})"
                        component_id = None
                    else:
                        # Try to find matching pricing component
                        component = PricingComponent.query.filter(
                            PricingComponent.service_id == service.service_id,
                            PricingComponent.component_name.contains(usage_type)
                        ).first()
                        
                        if component:
                            description = f"{service.service_name} - {component.component_name}"
                            component_id = component.component_id
                        else:
                            description = f"{service.service_name} - {usage_type} ({operation})"
                            component_id = None
                    
                    # Create invoice line item
                    line_item = InvoiceLineItem(
                        invoice_id=invoice.invoice_id,
                        component_id=component_id,
                        description=description,
                        quantity=usage_amount,
                        rate=unblended_rate,
                        discount=0,
                        currency='USD'
                    )
                    
                    db.session.add(line_item)
                    processed_lines += 1
                    
                except Exception as e:
                    errors.append(f"Row {processed_lines + 1}: {str(e)}")
                    continue
            
            # Update import status
            usage_import.processed_lines = processed_lines
            usage_import.status = 'processed' if not errors else 'failed'
            usage_import.processed_at = datetime.utcnow()
            
            if errors:
                usage_import.errors = '\n'.join(errors[:10])  # Store first 10 errors
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Processed {processed_lines} usage records',
                'invoice_id': invoice.invoice_id,
                'errors': errors[:10] if errors else []
            }
            
        except Exception as e:
            db.session.rollback()
            
            # Update import status to failed
            if 'usage_import' in locals():
                usage_import.status = 'failed'
                usage_import.errors = str(e)
                usage_import.processed_at = datetime.utcnow()
                db.session.commit()
            
            return {
                'status': 'error',
                'message': f'Failed to process usage import: {str(e)}'
            }

@celery.task(bind=True)
def process_api_import(self, import_id, api_config):
    """Process AWS usage import from Cost Explorer API"""
    app = create_app()
    
    with app.app_context():
        try:
            import boto3
            from datetime import datetime, timedelta
            
            usage_import = UsageImport.query.get(import_id)
            if not usage_import:
                raise Exception(f"Usage import {import_id} not found")
            
            # Update status to processing
            usage_import.status = 'processing'
            db.session.commit()
            
            # Initialize AWS Cost Explorer client
            ce_client = boto3.client(
                'ce',
                aws_access_key_id=app.config['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=app.config['AWS_SECRET_ACCESS_KEY'],
                region_name=app.config['AWS_REGION']
            )
            
            # Get client AWS account IDs
            client = usage_import.client
            client_aws_accounts = client.get_aws_account_ids()
            
            # Set date range (default to last month)
            end_date = datetime.now().date()
            start_date = end_date.replace(day=1) - timedelta(days=1)
            start_date = start_date.replace(day=1)
            
            # Query Cost Explorer API
            response = ce_client.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity='MONTHLY',
                Metrics=['UnblendedCost', 'UsageQuantity'],
                GroupBy=[
                    {'Type': 'DIMENSION', 'Key': 'SERVICE'},
                    {'Type': 'DIMENSION', 'Key': 'USAGE_TYPE'}
                ],
                Filter={
                    'Dimensions': {
                        'Key': 'LINKED_ACCOUNT',
                        'Values': client_aws_accounts
                    }
                }
            )
            
            # Create draft invoice
            invoice = Invoice(
                client_id=client.client_id,
                invoice_notes=f"Auto-generated from API import {import_id}",
                status='draft'
            )
            invoice.generate_invoice_number()
            db.session.add(invoice)
            db.session.flush()
            
            processed_lines = 0
            
            # Process API response
            for result in response['ResultsByTime']:
                for group in result['Groups']:
                    service_name = group['Keys'][0]
                    usage_type = group['Keys'][1]
                    
                    unblended_cost = float(group['Metrics']['UnblendedCost']['Amount'])
                    usage_quantity = float(group['Metrics']['UsageQuantity']['Amount'])
                    
                    if unblended_cost > 0:  # Only process non-zero costs
                        # Find matching service
                        service = Service.query.filter_by(service_name=service_name).first()
                        
                        if service:
                            # Try to find matching pricing component
                            component = PricingComponent.query.filter(
                                PricingComponent.service_id == service.service_id,
                                PricingComponent.component_name.contains(usage_type)
                            ).first()
                            
                            description = f"{service.service_name} - {usage_type}"
                            component_id = component.component_id if component else None
                        else:
                            description = f"{service_name} - {usage_type}"
                            component_id = None
                        
                        # Calculate rate
                        rate = unblended_cost / usage_quantity if usage_quantity > 0 else unblended_cost
                        
                        # Create invoice line item
                        line_item = InvoiceLineItem(
                            invoice_id=invoice.invoice_id,
                            component_id=component_id,
                            description=description,
                            quantity=usage_quantity if usage_quantity > 0 else 1,
                            rate=rate,
                            discount=0,
                            currency='USD'
                        )
                        
                        db.session.add(line_item)
                        processed_lines += 1
            
            # Update import status
            usage_import.processed_lines = processed_lines
            usage_import.status = 'processed'
            usage_import.processed_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Processed {processed_lines} API usage records',
                'invoice_id': invoice.invoice_id
            }
            
        except Exception as e:
            db.session.rollback()
            
            # Update import status to failed
            if 'usage_import' in locals():
                usage_import.status = 'failed'
                usage_import.errors = str(e)
                usage_import.processed_at = datetime.utcnow()
                db.session.commit()
            
            return {
                'status': 'error',
                'message': f'Failed to process API import: {str(e)}'
            }

@celery.task(bind=True)
def cleanup_old_imports(self):
    """Clean up old usage import files"""
    app = create_app()
    
    with app.app_context():
        try:
            from datetime import datetime, timedelta
            
            # Delete imports older than 90 days
            cutoff_date = datetime.utcnow() - timedelta(days=90)
            
            old_imports = UsageImport.query.filter(
                UsageImport.import_date < cutoff_date
            ).all()
            
            deleted_count = 0
            
            for usage_import in old_imports:
                # Delete file if exists
                if usage_import.file_path and os.path.exists(usage_import.file_path):
                    try:
                        os.remove(usage_import.file_path)
                    except OSError:
                        pass
                
                # Delete database record
                db.session.delete(usage_import)
                deleted_count += 1
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Cleaned up {deleted_count} old usage imports'
            }
            
        except Exception as e:
            db.session.rollback()
            return {
                'status': 'error',
                'message': f'Failed to cleanup old imports: {str(e)}'
            }