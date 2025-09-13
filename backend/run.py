from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    print(f"🚀 Starting AWS Billing Management System Backend")
    print(f"   • Port: {port}")
    print(f"   • Debug: {debug}")
    print(f"   • Database: {app.config['SQLALCHEMY_DATABASE_URI'].split('@')[1] if '@' in app.config['SQLALCHEMY_DATABASE_URI'] else 'Unknown'}")
    
    app.run(debug=debug, host='0.0.0.0', port=port)