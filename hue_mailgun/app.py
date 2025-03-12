import os, sys, re, json, requests
from datetime import datetime
from os import environ as env
from urllib.parse import quote_plus, urlencode

from authlib.integrations.flask_client import OAuth
from dotenv import find_dotenv, load_dotenv
from flask import Flask, redirect, render_template, session, url_for, jsonify, request, abort, send_from_directory


try: from settings_local import mail
except: pass

ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)

app = Flask(__name__)
app.secret_key = env.get("APP_SECRET_KEY")


import campaigns
import dashboard

@app.route('/campaign')
@app.route('/campaign/')
def campaign():
    return render_template('campaign.html',)

if __name__ == '__main__':
    app.run()

