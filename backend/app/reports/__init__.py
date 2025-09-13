from flask import Blueprint

bp = Blueprint('reports', __name__, url_prefix='/api/reports')

from app.reports import routes