import os, sys, re, json, requests
from datetime import datetime
from os import environ as env
from urllib.parse import quote_plus, urlencode

from authlib.integrations.flask_client import OAuth
from flask import Flask, redirect, render_template, session, url_for, jsonify, request, abort, send_from_directory

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

app = Flask(__name__)
app.secret_key = env.get("APP_SECRET_KEY")

print(env.get("PASSWORD"))
print("Loaded.")

from campaigns import *
import dashboard


if __name__ == '__main__':
    app.run()

