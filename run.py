#!/usr/bin/env python3
"""
Production runner for Tej IT Solutions Billing System
"""

import os
import sys
from app import create_app

# Create Flask application
app = create_app()

if __name__ == '__main__':
    # Check if database exists
    if not os.path.exists('tej_billing.db'):
        print("Database not found. Please run: python database_setup.py")
        sys.exit(1)
    
    # Run in development mode
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=os.environ.get('FLASK_ENV') == 'development'
    )