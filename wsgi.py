#!/usr/bin/python
import sys
import logging
logging.basicConfig(stream=sys.stderr)
sys.path.insert(0,"/home/ubuntu/manatools.com/")
sys.path.insert(0,"/home/ubuntu/manatools.com/venv/lib/python3.8/site-packages")
from hue_mailgun.app import app as application
application.secret_key = "108436f942382b79b5b7ca43dece041d5b80d51cfc68c685a67a569addc1a0ef"

