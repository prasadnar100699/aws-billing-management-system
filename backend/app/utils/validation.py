import re
from email_validator import validate_email as email_validate, EmailNotValidError

def validate_email(email):
    """Validate email format"""
    try:
        email_validate(email)
        return True
    except EmailNotValidError:
        return False

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return "Password must be at least 8 characters long"
    
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return "Password must contain at least one digit"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return "Password must contain at least one special character"
    
    return None

def validate_gst_number(gst_number):
    """Validate Indian GST number format"""
    if not gst_number:
        return False
    
    # GST format: 2 digits + 5 letters + 4 digits + 1 letter + 1 digit/letter + Z + 1 digit/letter
    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    return bool(re.match(pattern, gst_number))

def validate_aws_account_id(account_id):
    """Validate AWS account ID format (12 digits)"""
    if not account_id:
        return False
    
    return bool(re.match(r'^\d{12}$', account_id))

def validate_phone_number(phone):
    """Validate phone number format"""
    if not phone:
        return True  # Phone is optional
    
    # Allow various phone formats
    pattern = r'^[\+]?[1-9][\d\s\-\(\)]{7,15}$'
    return bool(re.match(pattern, phone))

def validate_currency_code(currency):
    """Validate currency code"""
    valid_currencies = ['USD', 'INR', 'EUR', 'GBP']
    return currency in valid_currencies

def validate_invoice_number(invoice_number):
    """Validate invoice number format: TejIT-{clientID}-{YYYYMM}-{sequence}"""
    if not invoice_number:
        return False
    
    pattern = r'^TejIT-\d+-\d{6}-\d+$'
    return bool(re.match(pattern, invoice_number))

def sanitize_filename(filename):
    """Sanitize filename for safe storage"""
    # Remove or replace unsafe characters
    filename = re.sub(r'[^\w\s\-_\.]', '', filename)
    filename = re.sub(r'[-\s]+', '-', filename)
    return filename.strip('-')

def validate_file_extension(filename, allowed_extensions):
    """Validate file extension"""
    if not filename:
        return False
    
    extension = filename.rsplit('.', 1)[-1].lower()
    return extension in allowed_extensions

def validate_file_size(file_size, max_size_mb=16):
    """Validate file size (default max 16MB)"""
    max_size_bytes = max_size_mb * 1024 * 1024
    return file_size <= max_size_bytes