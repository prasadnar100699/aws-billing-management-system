from flask import Blueprint

bp = Blueprint('usage', __name__, url_prefix='/api/usage')

from app.usage import routes