import os
import sys
from datetime import datetime
import json
from os import environ as env
from urllib.parse import quote_plus, urlencode

from authlib.integrations.flask_client import OAuth
from dotenv import find_dotenv, load_dotenv
from flask import Flask, redirect, render_template, session, url_for, jsonify, request, abort, send_from_directory
import requests

try: from settings_local import mail
except: pass

ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)

app = Flask(__name__)
app.secret_key = env.get("APP_SECRET_KEY")




# Mailgun API credentials (replace with your actual credentials)
MAILGUN_API_KEY = os.getenv("API_KEY") #your-api-key"  # Replace with your Mailgun API key
MAILGUN_TEMPLATES_URL = "https://api.mailgun.net/v3/huehd.com/templates" #AKA Campaigns


import pandas as pd


@app.route('/getanalytics/', methods=['GET'])
def get_analytics():
    data_list = []
    ANALYTICS_FOLDER = "static/analytics"

    dir_path = os.path.dirname(os.path.realpath(__file__)) 

    # Get all CSV files from the analytics folder
    for filename in os.listdir(os.path.join(dir_path,ANALYTICS_FOLDER)):
        if filename.endswith(".csv"):
            filepath = os.path.join(dir_path,os.path.join(ANALYTICS_FOLDER, filename))
            df = pd.read_csv(filepath)  # Read CSV into DataFrame
            df_dict = df.to_dict(orient="records")  # Convert to list of dictionaries
            data_list.append({
                "filename": filename,  # Include file name for reference
                "data": df_dict  # Store CSV data
            })

    return jsonify(data_list)  # Return JSON response

LISTS_FOLDER = "static/lists"

@app.route("/get-lists", methods=["POST"])
def get_lists():
    
    data_list=[]
    # Get all CSV files from the analytics folder
    dir_path = os.path.dirname(os.path.realpath(__file__)) 
    LIST_DIR = os.path.join(dir_path,LISTS_FOLDER)
    index=0
    for filename in os.listdir(LIST_DIR):
        if filename.endswith(".csv"):
            full_path = os.path.join(LIST_DIR,filename)
            # Read the first line of a file and store as a string
            with open(full_path, "r") as f:
                lines = f.readlines()
                first_line = lines[0].strip()
                count = len(lines)
                print("c:"+str(count))
                emails = lines[1:count]
                print("ems:"+str(emails))
                
            data_list.append({
                "data": {"filename":filename,"listname":first_line,"id":index,"count":count,"emails":emails}  # Store CSV data
            })
            index += 1

    return jsonify({"success": True, "lists": data_list})


@app.route("/download-list/<filename>")
def download_file(filename):
    dir_path = os.path.dirname(os.path.realpath(__file__)) 
    data_list=[]
    # Get all CSV files from the analytics folder
    LIST_DIR = os.path.join(dir_path,LISTS_FOLDER)
     # Ensure the filename is safe
    if ".." in filename or "/" in filename or len(filename.split('.')) != 2 or filename.split('.')[1] != "csv":
        print (".." in filename)
        print("/" in filename)
        print (len(filename.split('.')))
        print(filename.split('.')[1])


        abort(400, "Invalid filename")

    file_path = os.path.join(LIST_DIR, filename)
    
    if not os.path.isfile(file_path):
        abort(404, "File not found")
    
    return send_from_directory(LIST_DIR, filename, as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)

@app.route("/get-campaign", methods=["POST"])
def get_campaign():
    try:
        # Get optional parameters from the POST request
        data = request.get_json()
        template_id = data.get("templateId")
        url = "https://api.mailgun.net/v3/huehd.com/templates/"+template_id+"/versions"
        print("URL:"+url)
        response = requests.get(url, auth=("api", MAILGUN_API_KEY))
        if response.status_code == 200:
            template_data = response.json()
            # data = template_data["template"]["version"]["template"]
            print("YES")
            print(template_data)
            version = template_data['template']['versions'][0]['tag']
            print("VERS:"+version)
            url = "https://api.mailgun.net/v3/huehd.com/templates/"+template_id+"/versions/"+version
            response = requests.get(url, auth=("api", MAILGUN_API_KEY))
            if response.status_code == 200:
                template_data = response.json()
                html = template_data['template']['version']['template']
                return jsonify({"success":True,"data":html})

            else:
                print(response.text)
                 
            return jsonify({"success":True,"data":data})
        else:
            print("NO")
            return jsonify({"success":False,"data":response.text})
    except:
        print("EXC")
        return jsonify({"success":False,"data":{}})
    
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
            data = response.json().get('items')
            print(data)
            campaigns = []
            for i in range(len(data)): 
                campaigns.append(data[i])

            return jsonify({"success": True, "campaigns": campaigns})
        else:
            return jsonify({"success": False, "error": response.json()}), response.status_code

    except Exception as e:
        print(e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/try-upload-list', methods=["POST"])
def try_upload_list():
    if "file" not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files["file"]
            
    filename = file.filename

    dir_path = os.path.dirname(os.path.realpath(__file__)) 
    LIST_DIR = os.path.join(dir_path,LISTS_FOLDER)
    file_path = os.path.join(LIST_DIR, filename)

    lines = 0
    try:
        with open(file_path, "r") as f:
            lines = len(f.readlines())
    except Exception as e:
        print(e)
 
    if os.path.exists(file_path):
        return jsonify({"success":True,"exists": True,"lines":lines})
    else:
        return jsonify({"success":True,"exists": False})

@app.route('/upload-list', methods=["POST"])
def upload_list():
    if "file" not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files["file"]
    filename = file.filename

    dir_path = os.path.dirname(os.path.realpath(__file__)) 
    LIST_DIR = os.path.join(dir_path,LISTS_FOLDER)
    file_path = os.path.join(LIST_DIR, filename)

    file.save(file_path)
    return jsonify({"message": "File uploaded successfully"})

@app.route('/get-from-addresses', methods=["POST"])
def get_authorized_from_addresses():
    url = "https://api.mailgun.net/v3/huehd.com/domains"
    response = requests.get(url, auth=("api", MAILGUN_API_KEY))
    return jsonify({"success":True,
    "data":[
        "HUE Crew, marketing@huehd.com",
        "HUE Sales, sales@huehd.com",
        "Cathy Doel, cathy@huehd.com",
        "Jordan, jordan@huehd.com",
        "Charlie, charlie@huehd.com",]
     })
    print(response)

    if response.status_code == 200:
        data = response.json()
        domains = [domain["name"] for domain in data.get("items", [])]
        return jsonify({"success":True,"data":domains})
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return jsonify({"success": False, "error": str("ero")})

@app.route('/analytics')
def analytics():
    return render_template('analytics.html',)

@app.route('/')
def home():
    return render_template('index.html',)

if __name__ == '__main__':
    app.run()

