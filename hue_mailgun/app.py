import os, sys, re, json, requests, logging
from datetime import datetime
from os import environ as env
from urllib.parse import quote_plus, urlencode

from authlib.integrations.flask_client import OAuth
from flask import Flask, redirect, render_template, session, url_for, jsonify, request, abort, send_from_directory

LOCAL = False
try: from settings_local import *
except: LOCAL = False
if not LOCAL:
    # Server
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

from dotenv import find_dotenv, load_dotenv
ENV_FILE = find_dotenv()
if ENV_FILE:
    print("Found")
    load_dotenv(ENV_FILE)
else: 
    print("not found:"+os.getcwd())

# Configure logging
logging.basicConfig(
    filename='hue_mailgun/flask.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = env.get("APP_SECRET_KEY")
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///campaigns.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
from models import db
db.init_app(app)

# Initialize Celery
from celery_config import make_celery
celery = make_celery(app)

print(env.get("PASSWORD"))
print("Loaded.")

with app.app_context():
    db.create_all()
    logger.info("Database tables created if they didn't exist")

# Import routes after app initialization
from campaigns import *
import dashboard

@app.errorhandler(Exception)
def handle_exception(e):
    logger.exception("Unhandled exception: %s", str(e))
    return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)

