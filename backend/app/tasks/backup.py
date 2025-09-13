from celery import Celery
from app import create_app
import subprocess
import os
import shutil
import tarfile
from datetime import datetime, timedelta
import boto3
from botocore.exceptions import ClientError

# Create Celery instance
celery = Celery('backup')

@celery.task(bind=True)
def backup_database(self):
    """Backup MySQL database"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create backup directory
            backup_dir = os.path.join(app.config['UPLOAD_DIR'], 'backups', 'database')
            os.makedirs(backup_dir, exist_ok=True)
            
            # Generate backup filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"aws_billing_db_backup_{timestamp}.sql"
            backup_path = os.path.join(backup_dir, backup_filename)
            
            # MySQL dump command
            dump_cmd = [
                'mysqldump',
                '-h', app.config['DB_HOST'],
                '-P', app.config['DB_PORT'],
                '-u', app.config['DB_USER'],
                f'-p{app.config["DB_PASSWORD"]}',
                '--single-transaction',
                '--routines',
                '--triggers',
                app.config['DB_NAME']
            ]
            
            # Execute mysqldump
            with open(backup_path, 'w') as backup_file:
                result = subprocess.run(
                    dump_cmd,
                    stdout=backup_file,
                    stderr=subprocess.PIPE,
                    text=True
                )
            
            if result.returncode != 0:
                raise Exception(f"mysqldump failed: {result.stderr}")
            
            # Compress backup
            compressed_path = f"{backup_path}.gz"
            with open(backup_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remove uncompressed file
            os.remove(backup_path)
            
            # Upload to S3 if configured
            s3_path = None
            if app.config.get('AWS_S3_BUCKET'):
                s3_path = upload_to_s3(compressed_path, f"database-backups/{os.path.basename(compressed_path)}")
            
            return {
                'status': 'success',
                'message': 'Database backup completed successfully',
                'backup_path': compressed_path,
                's3_path': s3_path,
                'size': os.path.getsize(compressed_path)
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Database backup failed: {str(e)}'
            }

@celery.task(bind=True)
def backup_documents(self):
    """Backup documents and uploads"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create backup directory
            backup_dir = os.path.join(app.config['UPLOAD_DIR'], 'backups', 'documents')
            os.makedirs(backup_dir, exist_ok=True)
            
            # Generate backup filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"aws_billing_documents_backup_{timestamp}.tar.gz"
            backup_path = os.path.join(backup_dir, backup_filename)
            
            # Create tar archive
            with tarfile.open(backup_path, 'w:gz') as tar:
                # Add documents
                documents_dir = os.path.join(app.config['UPLOAD_DIR'], 'documents')
                if os.path.exists(documents_dir):
                    tar.add(documents_dir, arcname='documents')
                
                # Add invoice PDFs
                invoices_dir = os.path.join(app.config['UPLOAD_DIR'], 'invoices')
                if os.path.exists(invoices_dir):
                    tar.add(invoices_dir, arcname='invoices')
                
                # Add usage imports
                usage_dir = os.path.join(app.config['UPLOAD_DIR'], 'usage_imports')
                if os.path.exists(usage_dir):
                    tar.add(usage_dir, arcname='usage_imports')
            
            # Upload to S3 if configured
            s3_path = None
            if app.config.get('AWS_S3_BUCKET'):
                s3_path = upload_to_s3(backup_path, f"document-backups/{os.path.basename(backup_path)}")
            
            return {
                'status': 'success',
                'message': 'Documents backup completed successfully',
                'backup_path': backup_path,
                's3_path': s3_path,
                'size': os.path.getsize(backup_path)
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Documents backup failed: {str(e)}'
            }

@celery.task(bind=True)
def full_backup(self):
    """Perform full system backup"""
    app = create_app()
    
    with app.app_context():
        try:
            # Run database backup
            db_result = backup_database.delay()
            
            # Run documents backup
            docs_result = backup_documents.delay()
            
            # Wait for both tasks to complete
            db_backup = db_result.get()
            docs_backup = docs_result.get()
            
            # Create full backup summary
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            summary = {
                'timestamp': timestamp,
                'database_backup': db_backup,
                'documents_backup': docs_backup,
                'status': 'success' if db_backup['status'] == 'success' and docs_backup['status'] == 'success' else 'partial'
            }
            
            # Save backup summary
            summary_dir = os.path.join(app.config['UPLOAD_DIR'], 'backups', 'summaries')
            os.makedirs(summary_dir, exist_ok=True)
            
            summary_path = os.path.join(summary_dir, f"backup_summary_{timestamp}.json")
            with open(summary_path, 'w') as f:
                json.dump(summary, f, indent=2)
            
            return summary
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Full backup failed: {str(e)}'
            }

@celery.task(bind=True)
def cleanup_old_backups(self):
    """Clean up old backup files"""
    app = create_app()
    
    with app.app_context():
        try:
            backup_base_dir = os.path.join(app.config['UPLOAD_DIR'], 'backups')
            cutoff_date = datetime.now() - timedelta(days=30)  # Keep backups for 30 days
            
            deleted_count = 0
            total_size_freed = 0
            
            # Clean up local backups
            for root, dirs, files in os.walk(backup_base_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                    
                    if file_mtime < cutoff_date:
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        deleted_count += 1
                        total_size_freed += file_size
            
            # Clean up S3 backups if configured
            s3_deleted = 0
            if app.config.get('AWS_S3_BUCKET'):
                s3_deleted = cleanup_s3_backups(cutoff_date)
            
            return {
                'status': 'success',
                'message': f'Cleaned up {deleted_count} local backup files and {s3_deleted} S3 backup files',
                'local_files_deleted': deleted_count,
                's3_files_deleted': s3_deleted,
                'size_freed_bytes': total_size_freed
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Backup cleanup failed: {str(e)}'
            }

def upload_to_s3(file_path, s3_key):
    """Upload file to S3"""
    try:
        app = create_app()
        
        s3_client = boto3.client(
            's3',
            aws_access_key_id=app.config['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=app.config['AWS_SECRET_ACCESS_KEY'],
            region_name=app.config['AWS_REGION']
        )
        
        s3_client.upload_file(
            file_path,
            app.config['AWS_S3_BUCKET'],
            s3_key
        )
        
        return f"s3://{app.config['AWS_S3_BUCKET']}/{s3_key}"
        
    except ClientError as e:
        raise Exception(f"S3 upload failed: {str(e)}")

def cleanup_s3_backups(cutoff_date):
    """Clean up old S3 backup files"""
    try:
        app = create_app()
        
        s3_client = boto3.client(
            's3',
            aws_access_key_id=app.config['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=app.config['AWS_SECRET_ACCESS_KEY'],
            region_name=app.config['AWS_REGION']
        )
        
        # List objects in backup prefixes
        prefixes = ['database-backups/', 'document-backups/']
        deleted_count = 0
        
        for prefix in prefixes:
            response = s3_client.list_objects_v2(
                Bucket=app.config['AWS_S3_BUCKET'],
                Prefix=prefix
            )
            
            if 'Contents' in response:
                for obj in response['Contents']:
                    if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                        s3_client.delete_object(
                            Bucket=app.config['AWS_S3_BUCKET'],
                            Key=obj['Key']
                        )
                        deleted_count += 1
        
        return deleted_count
        
    except ClientError as e:
        raise Exception(f"S3 cleanup failed: {str(e)}")

@celery.task(bind=True)
def restore_database(self, backup_path):
    """Restore database from backup"""
    app = create_app()
    
    with app.app_context():
        try:
            if not os.path.exists(backup_path):
                raise Exception(f"Backup file not found: {backup_path}")
            
            # Decompress if needed
            if backup_path.endswith('.gz'):
                import gzip
                decompressed_path = backup_path[:-3]  # Remove .gz extension
                with gzip.open(backup_path, 'rb') as f_in:
                    with open(decompressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                sql_file = decompressed_path
            else:
                sql_file = backup_path
            
            # MySQL restore command
            restore_cmd = [
                'mysql',
                '-h', app.config['DB_HOST'],
                '-P', app.config['DB_PORT'],
                '-u', app.config['DB_USER'],
                f'-p{app.config["DB_PASSWORD"]}',
                app.config['DB_NAME']
            ]
            
            # Execute mysql restore
            with open(sql_file, 'r') as backup_file:
                result = subprocess.run(
                    restore_cmd,
                    stdin=backup_file,
                    stderr=subprocess.PIPE,
                    text=True
                )
            
            # Clean up decompressed file if created
            if sql_file != backup_path:
                os.remove(sql_file)
            
            if result.returncode != 0:
                raise Exception(f"mysql restore failed: {result.stderr}")
            
            return {
                'status': 'success',
                'message': 'Database restored successfully'
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Database restore failed: {str(e)}'
            }