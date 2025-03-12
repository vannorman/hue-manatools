from flask import  render_template, request, session, redirect, url_for, flash, current_app
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

from app import app


# Define db and bcrypt without importing from app.py
import os
dir_path = os.path.dirname(os.path.realpath(__file__)) 
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{dir_path}/resellers.db"
db = SQLAlchemy(app)
bcrypt = Bcrypt()


PRODUCTS = [
    {"sku": "P001", "name": "Product 1", "msrp": 50.0},
    {"sku": "P002", "name": "Product 2", "msrp": 30.0},
    {"sku": "P003", "name": "Product 3", "msrp": 20.0},
]

# User Model (Now it works independently)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    percent_discount = db.Column(db.Float, default=0.0)
    moq = db.Column(db.Integer, default=1)
    orders_history = db.Column(db.Text, default="[]")


with app.app_context():
    db.create_all()

# **🔧 Initialize database safely**
def initialize_db():
    with app.app_context():
        db.create_all()

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        with app.app_context():  # Avoid circular imports
            user = User.query.filter_by(username=username).first()

        if user:
            if bcrypt.check_password_hash(user.password, password):
                session['user'] = username
                flash("Login successful!", "success")
                return redirect(url_for('dashboard'))
            else:
                flash("Incorrect password!", "danger")
                return redirect(url_for('login'))
        else:
            return render_template('login.html', username=username, prompt_create=True)

    return render_template('login.html', prompt_create=False)

@app.route('/create_user', methods=['POST'])
def create_user():
    username = request.form['username']
    password = request.form['password']

    with app.app_context():
        existing_user = User.query.filter_by(username=username).first()

    if existing_user:
        flash("User already exists!", "warning")
        return redirect(url_for('login'))

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')

    with current_app.app_context():
        new_user = User(username=username, password=hashed_pw)
        db.session.add(new_user)
        db.session.commit()

    flash("Account created successfully! You can now log in.", "success")
    return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.pop('user', None)
    flash("Logged out successfully!", "info")
    return redirect(url_for('login'))

@app.route('/dashboard')
@app.route('/dashboard/')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))  # Redirect if not logged in

    user = User.query.filter_by(username=session['user']).first()
    if not user:
        return "User not found!", 404

    return render_template("dashboard.html", user=user, products=PRODUCTS)


