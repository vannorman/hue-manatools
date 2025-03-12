    
import requests
import json
from dotenv import load_dotenv
import os
import sys

load_dotenv()  # take API key from .env
api_key = os.getenv("API_KEY")


def get_contacts(email_file):
    with open(email_file) as file:
        lines = [line.rstrip() for line in file]
        for line in lines:
            values = line.split(',')
            contacts.append(values)

# Here is how we used to preview what would happen before pull the trigger.
#while True and state == 1:
#    Prompt = input(bcolors.WARNING+"Does this look right?"+bcolors.ENDC+" answer y or n\n")
#    if Prompt in ['y', 'yes']:
#        state = 2 # switch state to processing state
#    elif Prompt in ['n', 'no']:
#        print("Whew! Good thing you didn't accidentally do that ..")
#        sys.exit()

# def send_simple_message(name,schoolName,email,subject):
def send_simple_message(name,email,subject):
	return requests.post(
		"https://api.mailgun.net/v3/huehd.com/messages",
		auth=("api", api_key),
		data={"from": from_address,
			"to": name+"<"+email+">",
			"subject": subject,
			"template": template,
			# "h:X-Mailgun-Variables": json.dumps({"FirstName": name,"SchoolName": schoolName}),
			"h:X-Mailgun-Variables": json.dumps({"FirstName": name}),
            }
        )
    # You can see a record of this email in your logs: https://app.mailgun.com/app/logs.

def run():
    for contact in contacts:
        try: 
            name=contact[0]
            email=contact[1]
#            schoolName=contact[2]
            subject=subject
            try:
                # send_simple_message(name,schoolName,email,subject)
                send_simple_message(name,email,subject)
                print("Success: "+email)
            except Exception as e:
                print(f"Failed: {email} Exception: {e}")
        except Exception as e:
            print(f"Failed: {contact} Exception: {e}")


