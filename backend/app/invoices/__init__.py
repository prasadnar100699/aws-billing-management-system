from flask import Blueprint

bp = Blueprint('invoices', __name__, url_prefix='/api/invoices')

from app.invoices import routes