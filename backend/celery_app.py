from app import create_app, make_celery

# Create Flask app and Celery instance
app = create_app()
celery = make_celery(app)

# Import all task modules to register them
from app.tasks import pdf_generator, email_sender, usage_importer, report_generator, backup

if __name__ == '__main__':
    celery.start()