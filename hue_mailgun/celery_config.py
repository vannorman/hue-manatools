from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

def make_celery(app=None):
    # Configure Redis connection
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    
    celery = Celery(
        'hue_mailgun',
        broker=redis_url,
        backend=redis_url,
        include=['hue_mailgun.tasks']
    )
    
    # Use task serialization settings suitable for our needs
    celery.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        # Rate limiting: maximum 10 tasks per minute
        task_annotations={'*': {'rate_limit': '10/m'}},
        # Retry settings
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        # Configure retry behavior
        task_time_limit=300,  # 5 minutes
        broker_connection_retry_on_startup=True,
    )
    
    if app:
        class ContextTask(celery.Task):
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)
        
        celery.Task = ContextTask
    
    return celery 