import os
import requests
import json
import time
from datetime import datetime
import logging
from celery import shared_task
from .models import CampaignStatus, EmailLog, db

# Set up logging
logging.basicConfig(
    filename='hue_mailgun/flask.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

MAILGUN_API_KEY = os.getenv("API_KEY")

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_campaign_email(self, campaign_id, recipient_name, recipient_email, subject, from_address, template):
    """Send a single campaign email with retry capability"""
    logger.info(f"Sending email to: {recipient_email} for campaign ID: {campaign_id}")
    
    try:
        # Look up the email log entry
        email_log = EmailLog.query.filter_by(
            campaign_id=campaign_id,
            recipient_email=recipient_email
        ).first()
        
        if not email_log:
            logger.error(f"Email log not found for {recipient_email} in campaign {campaign_id}")
            return False
        
        # Set the email log to in progress
        email_log.status = 'in_progress'
        db.session.commit()
        
        # Make the actual API call to Mailgun
        response = requests.post(
            "https://api.mailgun.net/v3/huehd.com/messages",
            auth=("api", MAILGUN_API_KEY),
            data={
                "from": from_address,
                "to": f"{recipient_name}<{recipient_email}>",
                "subject": subject,
                "template": template,
                "h:X-Mailgun-Variables": json.dumps({"FirstName": recipient_name})
            }
        )
        
        # Update campaign status based on response
        if response.status_code == 200:
            logger.info(f"Successfully sent email to {recipient_email}")
            
            email_log.status = 'sent'
            email_log.sent_at = datetime.utcnow()
            
            # Update the campaign status counters
            campaign = CampaignStatus.query.get(campaign_id)
            if campaign:
                campaign.processed_count += 1
                campaign.success_count += 1
                
                # If all processed, mark as completed
                if campaign.processed_count >= campaign.total_recipients:
                    campaign.status = 'completed'
                
                db.session.commit()
            
            return True
        else:
            # Handle rate limiting - Mailgun returns 429 for rate limits
            if response.status_code == 429:
                logger.warning(f"Rate limited. Retrying in 60 seconds for {recipient_email}")
                # Retry with backoff
                raise self.retry(
                    exc=Exception(f"Rate limited: {response.text}"),
                    countdown=60 * (self.request.retries + 1)
                )
            
            # Other API errors
            error_message = f"Failed with code {response.status_code}: {response.text}"
            logger.error(error_message)
            
            email_log.status = 'failed'
            email_log.error_message = error_message
            
            # Update the campaign status counters
            campaign = CampaignStatus.query.get(campaign_id)
            if campaign:
                campaign.processed_count += 1
                campaign.failure_count += 1
                
                # If all processed, mark campaign as completed (even with failures)
                if campaign.processed_count >= campaign.total_recipients:
                    if campaign.failure_count == campaign.total_recipients:
                        campaign.status = 'failed'
                        campaign.error_message = "All emails failed to send"
                    else:
                        campaign.status = 'completed'
                
                db.session.commit()
            
            return False
            
    except Exception as e:
        logger.exception(f"Exception sending email to {recipient_email}: {str(e)}")
        
        # Try to update the database if possible
        try:
            email_log = EmailLog.query.filter_by(
                campaign_id=campaign_id,
                recipient_email=recipient_email
            ).first()
            
            if email_log:
                email_log.status = 'failed'
                email_log.error_message = str(e)
                
                campaign = CampaignStatus.query.get(campaign_id)
                if campaign:
                    campaign.processed_count += 1
                    campaign.failure_count += 1
                    
                    if campaign.processed_count >= campaign.total_recipients:
                        if campaign.failure_count == campaign.total_recipients:
                            campaign.status = 'failed'
                            campaign.error_message = "All emails failed to send"
                        else:
                            campaign.status = 'completed'
                    
                    db.session.commit()
        except Exception as db_error:
            logger.exception(f"Database error: {str(db_error)}")
        
        # Retry a few times before giving up completely
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        
        return False

@shared_task
def process_campaign(campaign_id):
    """Process an entire campaign by scheduling individual email tasks"""
    logger.info(f"Starting to process campaign ID: {campaign_id}")
    
    try:
        campaign = CampaignStatus.query.get(campaign_id)
        if not campaign:
            logger.error(f"Campaign {campaign_id} not found")
            return False
        
        # Update campaign status to in_progress
        campaign.status = 'in_progress'
        db.session.commit()
        
        # Get all pending email logs for this campaign
        email_logs = EmailLog.query.filter_by(
            campaign_id=campaign_id,
            status='pending'
        ).all()
        
        logger.info(f"Found {len(email_logs)} pending emails to send for campaign {campaign_id}")
        
        # Schedule individual email tasks with a slight delay between each
        # to respect rate limits
        for i, email_log in enumerate(email_logs):
            # Delay each email by a small amount to avoid hammering the API
            # Space them out to respect the rate limit (10/minute configured in Celery)
            send_campaign_email.apply_async(
                args=[
                    campaign_id,
                    email_log.recipient_name,
                    email_log.recipient_email,
                    campaign.subject,
                    campaign.from_address,
                    campaign.campaign_name
                ],
                countdown=i * 6  # Space tasks 6 seconds apart (allows ~10 per minute)
            )
        
        return True
    
    except Exception as e:
        logger.exception(f"Error processing campaign {campaign_id}: {str(e)}")
        
        # Update campaign as failed
        try:
            campaign = CampaignStatus.query.get(campaign_id)
            if campaign:
                campaign.status = 'failed'
                campaign.error_message = str(e)
                db.session.commit()
        except Exception as db_error:
            logger.exception(f"Database error: {str(db_error)}")
        
        return False 