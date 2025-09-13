#!/bin/bash

# AWS Billing Management System - Database Backup Script

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Set default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-aws_billing_system}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}

# Create backup directory
BACKUP_DIR="uploads/backups/database"
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/aws_billing_db_backup_$TIMESTAMP.sql"

echo "Starting database backup..."
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"

# Perform MySQL dump
mysqldump \
    -h "$DB_HOST" \
    -P "$DB_PORT" \
    -u "$DB_USER" \
    -p"$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --add-drop-database \
    --databases "$DB_NAME" > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✓ Database backup completed successfully"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    COMPRESSED_FILE="$BACKUP_FILE.gz"
    
    echo "✓ Backup compressed: $COMPRESSED_FILE"
    
    # Get file size
    SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo "Backup size: $SIZE"
    
    # Clean up old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
    echo "✓ Old backups cleaned up"
    
else
    echo "✗ Database backup failed"
    exit 1
fi

echo "Backup completed: $COMPRESSED_FILE"