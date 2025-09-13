from flask import jsonify
from app.health import bp
from app import db
from datetime import datetime

@bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check database connection
        db.session.execute('SELECT 1')
        db_status = 'healthy'
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'

    health_data = {
        'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
        'timestamp': datetime.utcnow().isoformat(),
        'services': {
            'database': db_status
        },
        'version': '1.0.0'
    }

    status_code = 200 if health_data['status'] == 'healthy' else 503
    return jsonify(health_data), status_code