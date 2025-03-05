import os
import sys
from datetime import datetime
import json
from os import environ as env
from urllib.parse import quote_plus, urlencode

from authlib.integrations.flask_client import OAuth
from dotenv import find_dotenv, load_dotenv
from flask import Flask, redirect, render_template, session, url_for, jsonify, request

try: from settings_local import mail
except: pass

ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)

app = Flask(__name__)
app.secret_key = env.get("APP_SECRET_KEY")

from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# Mailgun API credentials (replace with your actual credentials)
MAILGUN_API_KEY = "your-api-key"  # Replace with your Mailgun API key
MAILGUN_DOMAIN = "your-domain.com"  # Replace with your Mailgun domain
MAILGUN_CAMPAIGN_URL = f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/campaigns"
MAILGUN_TEMPLATES_URL = "https://api.mailgun.net/v3/huehd.com/templates" #AKA Campaigns


@app.route("/get-campaigns", methods=["POST"])
def get_campaigns():
    """
    Fetches Mailgun campaigns and returns them as JSON.
    Accepts optional 'limit' and 'skip' parameters in the request.
    """
    try:
        # Get optional parameters from the POST request
        data = request.get_json()
        limit = data.get("limit", 100)  # Default limit is 100
        skip = data.get("skip", 0)      # Default skip is 0

 

        # Make the API request to Mailgun
        response = requests.get(
            MAILGUN_TEMPLATES_URL,
            auth=("api", MAILGUN_API_KEY),
            params={"limit": limit, "skip": skip},
        )

        # Handle response
        if response.status_code == 200:
            # We got the list.
            json_data = response.json().get("items",[])
            campaigns = extract_names(json_data)
            return jsonify({"success": True, "campaigns": campaigns})
        else:
            return jsonify({"success": False, "error": response.json()}), response.status_code

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500



def extract_names(json_data):
    try:
        return [item["name"] for item in json_data.get("items", [])]
    except KeyError:
        return []


@app.route('/analytics')
def analytics():
    return render_template('analytics.html',)

@app.route('/')
def home():
    return render_template('index.html',)

if __name__ == '__main__':
    app.run()

