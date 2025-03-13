import os, sys, re, json, requests
from datetime import datetime
from os import environ as env
from urllib.parse import quote_plus, urlencode

from authlib.integrations.flask_client import OAuth
from dotenv import find_dotenv, load_dotenv
from flask import Flask, redirect, render_template, session, url_for, jsonify, request, abort, send_from_directory

from app import app

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

LISTS_FOLDER = "lists"

def valid_email(email):
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(pattern, email) is not None

def get_recipients_from_file(filename):
    data_list = []
    dir_path = os.path.dirname(os.path.realpath(__file__)) 
    LIST_DIR = os.path.join(dir_path,LISTS_FOLDER)
    if filename.endswith(".csv"):
        full_path = os.path.join(LIST_DIR,filename)
        # Read the first line of a file and store as a string
        with open(full_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            for line in lines:
                print(line)
                l = line.split(',')
                name = l[0]
                email = l[1]
                data_list.append([name,email])
            # print("ems:"+str(emails))
            

    return data_list
    

@app.route("/run-campaign", methods=["POST"])
def run_campaign():
    data = request.get_json()
    print("HI:C")
    filename = data.get('csvFileName')
    print(filename)
    try: recipients = get_recipients_from_file(filename)
    except: return jsonify({"success": False, "message": "Get recipients from file didn't work: "+data.get('csvFileName')})
    
    contacts = [] # dupliate of recipients, but check each email first
    for r in recipients:
        try:
            name = r[0]
            email = r[1].strip()
            print("R:"+str(r))
            print("EM:"+email)
            if not valid_email(email):
                return jsonify({"success": False, "message": "The email "+email+" doesn't appear to be valid."});
            else:
                contacts.append([name,email])
                
        except:
            return jsonify({"success": False, "message": "Failed on '"+str(r)+"'\n\n The formatting of your recipients seems wrong. Is it 'name,email@email.com' with one per line? Check your commas, there should be one comma per line. Check for empty lines at the end, and delete them."})
            

    # TODO :Validate "contacts" 
    from_addr = data.get('from')
    campaign = data.get('campaign')
    subject = data.get('subject')
    # print ("Send campaign "+campaign+" to "+str(len(contacts))+" contacts w subject:"+subject+", from;"+from_addr)
    try: send_to_contacts(contacts,data.get('subject'),data.get('from'),data.get('campaign'))
    except: 
        return jsonify({"success": False, "message": "Failed ..!'"})

    data['count'] = len(contacts)
    return jsonify({"success": True, "data": data})

@app.route("/run-test", methods=["POST"])
def run_test():
    data = request.get_json()
    print("HI")
    try: recipients = data.get('recipients').split('\n')
    except: return jsonify({"success": False, "message": "Recipients didn't work: "+data.get('recipients')})
    
    contacts = []
    for r in recipients:
        try:
            t = r.split(',')
            email = t[1].strip()
            if valid_email(email):
                contacts.append([t[0],t[1]])
            else:
                return jsonify({"success": False, "message": "The email "+email+" doesn't appear to be valid."});
                
        except:
            return jsonify({"success": False, "message": "Failed on '"+r+"'\n\n The formatting of your recipients seems wrong. Is it 'name,email@email.com' with one per line? Check your commas, there should be one comma per line. Check for empty lines at the end, and delete them."})
            

    # TODO :Validate "contacts" 
    try: send_to_contacts(contacts,data.get('subject'),data.get('from'),data.get('campaign'))
    except: return jsonify({"success": False, "message": "Failed with contacts:"+str(contacts)+", with data;"+str(data)})
    
    return jsonify({"success": True, "result": {"count":len(contacts),"data":data}})

def send_simple_message(name,email,subject,from_address,template):
	return requests.post(
		"https://api.mailgun.net/v3/huehd.com/messages",
		auth=("api", MAILGUN_API_KEY),
		data={"from": from_address,
			"to": name+"<"+email+">",
			"subject": subject,
			"template": template,
			# "h:X-Mailgun-Variables": json.dumps({"FirstName": name,"SchoolName": schoolName}),
			"h:X-Mailgun-Variables": json.dumps({"FirstName": name}),
            }
        )
    # You can see a record of this email in your logs: https://app.mailgun.com/app/logs.

def send_to_contacts(contacts,subject,from_address,template):
    for contact in contacts:
        try: 
            name=contact[0]
            email=contact[1]
            subject=subject
            try:
                # send_simple_message(name,schoolName,email,subject)
                send_simple_message(name,email,subject,from_address,template)
                print("Success: "+email)
            except Exception as e:
                print(f"Failed: {email} Exception: {e}")
        except Exception as e:
            print(f"Failed: {contact} Exception: {e}")

 

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
            with open(full_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
                list_sample=""
                num_in_sample = min(len(lines),4)
                for i in range(num_in_sample):
                    list_sample += lines[i].strip()
                count = len(lines)
                # print("count:"+str(count))
                emails = lines[0:count]
                # print("ems:"+str(emails))
                
            data_list.append({
                "data": {"filename":filename,"listSample":list_sample,"id":index,"count":count,"emails":emails}  # Store CSV data
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
            version = template_data['template']['versions'][0]['tag']
#            print("YES")
#            print(template_data)
#            print("VERS:"+version)
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
            #print(data)
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
        with open(file_path, "r", encoding="utf-8") as f:
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

print("HI")

@app.route('/get-from-addresses', methods=["POST"])
def get_authorized_from_addresses():
    url = "https://api.mailgun.net/v3/huehd.com/domains"
    response = requests.get(url, auth=("api", MAILGUN_API_KEY))
    return jsonify({"success":True,
    "data":[
        "Jordan Dowthwaite-Clark, jordan@huehd.com",
        "Michael Fiden, michael@huehd.com",
        "Cathy Doel, cathy@huehd.com",
        "Charlie Van Norman, charlie@huehd.com", 
        "HUE Crew, marketing@huehd.com",
        "HUE Sales, sales@huehd.com",]
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

PASSWORD = os.getenv("PASSWORD")
print("API:"+MAILGUN_API_KEY)
print("PW:"+PASSWORD)
@app.route('/campaign', methods=['GET','POST'])
def campaign():
    if request.method == 'POST':
        if request.form.get('password') == PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('campaign'))
        else:
            return "Incorrect password", 403

    if not session.get('logged_in'):
        return '''
        <form method="POST">
            <input type="password" name="password" placeholder="Enter password">
            <button type="submit">Login</button>
        </form>
        '''

    return render_template('campaign.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)  # Remove session data
    return redirect(url_for('campaign'))  # Redirect to login page
