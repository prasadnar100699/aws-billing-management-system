from flask import Blueprint

bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

from app.analytics import routes