from flask import Blueprint

bp = Blueprint('health', __name__, url_prefix='/api')

from app.health import routes