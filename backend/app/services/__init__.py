from flask import Blueprint

bp = Blueprint('services', __name__, url_prefix='/api/services')

from app.services import routes