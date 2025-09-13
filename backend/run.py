from app import create_app, db
from app.models import *
import os

app = create_app()

@app.cli.command()
def init_db():
    """Initialize the database."""
    db.create_all()
    print("Database initialized!")

@app.cli.command()
def seed_db():
    """Seed the database with initial data."""
    from app.utils.seed_data import seed_initial_data
    seed_initial_data()
    print("Database seeded!")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)