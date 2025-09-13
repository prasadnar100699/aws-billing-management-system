#!/usr/bin/env python3
"""
Database initialization script for AWS Billing Management System
"""

import mysql.connector
from mysql.connector import Error
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def create_database():
    """Create database and import schema"""
    try:
        # Database connection parameters
        config = {
            'host': '202.71.157.170',
            'port': 3308,
            'user': 'admin',
            'password': 'admin@9955'
        }
        
        print("🔗 Connecting to MySQL server...")
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # Create database
        print("📊 Creating database...")
        cursor.execute("CREATE DATABASE IF NOT EXISTS aws_billing_system")
        cursor.execute("USE aws_billing_system")
        
        # Read and execute schema
        schema_path = Path(__file__).parent / 'schema.sql'
        print(f"📋 Importing schema from {schema_path}...")
        
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        # Split and execute statements
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        for statement in statements:
            if statement and not statement.startswith('--'):
                try:
                    cursor.execute(statement)
                except Error as e:
                    if "already exists" not in str(e).lower():
                        print(f"⚠️  Warning executing statement: {e}")
        
        connection.commit()
        print("✅ Database schema created successfully")
        
        # Import seed data
        seed_path = Path(__file__).parent / 'seed_data.sql'
        if seed_path.exists():
            print("🌱 Importing seed data...")
            with open(seed_path, 'r') as f:
                seed_sql = f.read()
            
            statements = [stmt.strip() for stmt in seed_sql.split(';') if stmt.strip()]
            for statement in statements:
                if statement and not statement.startswith('--'):
                    try:
                        cursor.execute(statement)
                    except Error as e:
                        if "duplicate entry" not in str(e).lower():
                            print(f"⚠️  Warning executing seed statement: {e}")
            
            connection.commit()
            print("✅ Seed data imported successfully")
        
        return True
        
    except Error as e:
        print(f"❌ Database setup failed: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

def test_connection():
    """Test database connection"""
    try:
        config = {
            'host': '202.71.157.170',
            'port': 3308,
            'user': 'admin',
            'password': 'admin@9955',
            'database': 'aws_billing_system'
        }
        
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # Test query
        cursor.execute("SELECT COUNT(*) FROM roles")
        result = cursor.fetchone()
        
        print(f"✅ Database connection successful - {result[0]} roles found")
        return True
        
    except Error as e:
        print(f"❌ Database connection failed: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    print("🚀 AWS Billing Management System - Database Setup")
    print("=" * 60)
    
    if create_database():
        if test_connection():
            print("\n✅ Database setup completed successfully!")
            print("\n🎯 Next steps:")
            print("1. Start the backend: python run.py")
            print("2. Start the frontend: cd ../frontend && npm run dev")
        else:
            print("\n❌ Database setup completed but connection test failed")
            sys.exit(1)
    else:
        print("\n❌ Database setup failed")
        sys.exit(1)