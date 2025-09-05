from datetime import datetime
from app import db

class ExchangeRate(db.Model):
    __tablename__ = 'exchange_rates'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Exchange rate details
    from_currency = db.Column(db.String(3), nullable=False, default='USD')
    to_currency = db.Column(db.String(3), nullable=False, default='INR')
    rate = db.Column(db.Numeric(10, 4), nullable=False)
    
    # Metadata
    rate_date = db.Column(db.Date, nullable=False, index=True)
    source = db.Column(db.String(100))  # API source, manual, etc.
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint on currency pair and date
    __table_args__ = (db.UniqueConstraint('from_currency', 'to_currency', 'rate_date'),)
    
    @staticmethod
    def get_latest_rate(from_currency='USD', to_currency='INR'):
        """Get the latest exchange rate for a currency pair."""
        return ExchangeRate.query.filter_by(
            from_currency=from_currency,
            to_currency=to_currency,
            is_active=True
        ).order_by(ExchangeRate.rate_date.desc()).first()
    
    @staticmethod
    def get_rate_on_date(rate_date, from_currency='USD', to_currency='INR'):
        """Get exchange rate for a specific date."""
        return ExchangeRate.query.filter_by(
            from_currency=from_currency,
            to_currency=to_currency,
            rate_date=rate_date,
            is_active=True
        ).first()
    
    def to_dict(self):
        """Convert exchange rate to dictionary."""
        return {
            'id': self.id,
            'from_currency': self.from_currency,
            'to_currency': self.to_currency,
            'rate': float(self.rate),
            'rate_date': self.rate_date.isoformat(),
            'source': self.source,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<ExchangeRate {self.from_currency}/{self.to_currency}: {self.rate}>'