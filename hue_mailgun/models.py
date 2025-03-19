from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class CampaignStatus(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    campaign_name = db.Column(db.String(255), nullable=False)
    from_address = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    list_name = db.Column(db.String(255), nullable=False)
    total_recipients = db.Column(db.Integer, default=0)
    processed_count = db.Column(db.Integer, default=0)
    success_count = db.Column(db.Integer, default=0)
    failure_count = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default='pending')  # pending, in_progress, completed, failed
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'campaign_name': self.campaign_name,
            'from_address': self.from_address,
            'subject': self.subject,
            'list_name': self.list_name,
            'total_recipients': self.total_recipients,
            'processed_count': self.processed_count,
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            'status': self.status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'progress_percentage': int((self.processed_count / max(self.total_recipients, 1)) * 100)
        }

class EmailLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaign_status.id'), nullable=False)
    recipient_name = db.Column(db.String(255), nullable=True)
    recipient_email = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default='pending')  # pending, sent, failed
    error_message = db.Column(db.Text, nullable=True)
    sent_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    campaign = db.relationship('CampaignStatus', backref=db.backref('email_logs', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'recipient_name': self.recipient_name,
            'recipient_email': self.recipient_email,
            'status': self.status,
            'error_message': self.error_message,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        } 