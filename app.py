from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///volunteer_matching.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    skills = db.Column(db.String(500))
    interests = db.Column(db.String(500))
    location = db.Column(db.String(120))

class Opportunity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    required_skills = db.Column(db.String(500))
    location = db.Column(db.String(120))
    organization = db.Column(db.String(120))
    category = db.Column(db.String(50), nullable=False, default='other')

class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    opportunity_id = db.Column(db.Integer, db.ForeignKey('opportunity.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    notes = db.Column(db.Text)

# Routes
@app.route('/')
@app.route('/login')
@app.route('/register')
@app.route('/opportunities')
@app.route('/browse')
def index():
    return app.send_static_file('index.html')

@app.route('/admin')
def admin():
    return app.send_static_file('admin.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
        
    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        skills=data.get('skills', ''),
        interests=data.get('interests', ''),
        location=data.get('location', '')
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'Registration successful'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email
        })
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/opportunities', methods=['GET'])
def get_opportunities():
    skills = request.args.get('skills', '').lower()
    location = request.args.get('location', '').lower()
    category = request.args.get('category', '')
    is_browse = request.args.get('browse', 'false').lower() == 'true'
    
    # Start with all opportunities
    query = Opportunity.query
    
    if is_browse:
        # For browse section, apply only category filter if provided
        if category and category != 'all':
            query = query.filter(Opportunity.category.ilike(f'%{category}%'))
            
        # If skills and location are provided, exclude matching opportunities
        if skills and location:
            non_matching = []
            all_opps = query.all()
            
            for opp in all_opps:
                skills_match = any(skill.strip() in opp.required_skills.lower() for skill in skills.split(','))
                location_match = location.lower() in opp.location.lower()
                
                if not (skills_match and location_match):
                    non_matching.append(opp)
            
            return jsonify([{
                'id': o.id,
                'title': o.title,
                'description': o.description,
                'required_skills': o.required_skills,
                'location': o.location,
                'organization': o.organization,
                'category': o.category
            } for o in non_matching])
    else:
        # For matched opportunities section
        if skills:
            skill_terms = [term.strip() for term in skills.split(',') if term.strip()]
            if skill_terms:
                skill_filters = [Opportunity.required_skills.ilike(f'%{term}%') for term in skill_terms]
                query = query.filter(db.or_(*skill_filters))
        
        if location:
            query = query.filter(Opportunity.location.ilike(f'%{location}%'))
    
    opportunities = query.all()
    return jsonify([{
        'id': o.id,
        'title': o.title,
        'description': o.description,
        'required_skills': o.required_skills,
        'location': o.location,
        'organization': o.organization,
        'category': o.category
    } for o in opportunities])

def add_sample_opportunities():
    sample_opportunities = [
        {
            'title': 'Teaching Assistant at DAV School',
            'description': 'Help students with their studies and support teachers in classroom activities.',
            'required_skills': 'teaching, patience, communication',
            'location': 'Bhubaneswar',
            'organization': 'DAV Public School',
            'category': 'education'
        },
        {
            'title': 'Web Development for Local NGO',
            'description': 'Help build and maintain website for a local non-profit organization.',
            'required_skills': 'HTML, CSS, JavaScript, React, coding',
            'location': 'Cuttack',
            'organization': 'Odisha Tech Foundation',
            'category': 'technology'
        },
        {
            'title': 'Community Garden Project',
            'description': 'Organize and maintain community garden, teach gardening skills to locals.',
            'required_skills': 'gardening, leadership, organization',
            'location': 'Puri',
            'organization': 'Green Odisha Initiative',
            'category': 'environment'
        },
        {
            'title': 'Animal Care Volunteer',
            'description': 'Help care for rescued animals and assist with adoption events.',
            'required_skills': 'animal care, compassion, reliability',
            'location': 'Rourkela',
            'organization': 'Animal Welfare Odisha',
            'category': 'community'
        },
        {
            'title': 'Digital Literacy Trainer',
            'description': 'Provide basic computer and smartphone training to senior citizens.',
            'required_skills': 'tech support, patience, teaching, computer',
            'location': 'Berhampur',
            'organization': 'Digital Saksharta',
            'category': 'technology'
        },
        {
            'title': 'Youth Sports Coach',
            'description': 'Coach and mentor young athletes in various sports activities.',
            'required_skills': 'sports, coaching, leadership, physical fitness',
            'location': 'Sambalpur',
            'organization': 'Odisha Sports Academy',
            'category': 'education'
        },
        {
            'title': 'Art Workshop Facilitator',
            'description': 'Conduct art workshops for children from underprivileged backgrounds.',
            'required_skills': 'art, teaching, creativity, drawing',
            'location': 'Bhubaneswar',
            'organization': 'Kalaa for All',
            'category': 'education'
        },
        {
            'title': 'Environmental Conservation',
            'description': 'Participate in beach cleaning and turtle conservation activities.',
            'required_skills': 'environmental awareness, physical work, teamwork',
            'location': 'Puri',
            'organization': 'Save Our Beach',
            'category': 'environment'
        },
        {
            'title': 'Mental Health Support',
            'description': 'Provide companionship and support to people dealing with mental health issues.',
            'required_skills': 'counseling, empathy, communication, psychology',
            'location': 'Cuttack',
            'organization': 'Mind Matters Odisha',
            'category': 'healthcare'
        },
        {
            'title': 'Coding Instructor',
            'description': 'Teach basic programming skills to high school students.',
            'required_skills': 'programming, teaching, Python, coding',
            'location': 'Bhubaneswar',
            'organization': 'Code for Tomorrow',
            'category': 'technology'
        }
    ]

    for opp in sample_opportunities:
        if not Opportunity.query.filter_by(title=opp['title']).first():
            new_opp = Opportunity(**opp)
            db.session.add(new_opp)
    
    db.session.commit()

@app.route('/api/check-application', methods=['GET'])
def check_application():
    user_id = request.args.get('user_id')
    opportunity_id = request.args.get('opportunity_id')

    if not user_id or not opportunity_id:
        return jsonify({'error': 'Missing required fields'}), 400

    existing_application = Application.query.filter_by(
        user_id=user_id,
        opportunity_id=opportunity_id
    ).first()

    return jsonify({
        'hasApplied': existing_application is not None,
        'status': existing_application.status if existing_application else None
    })

@app.route('/api/apply', methods=['POST'])
def apply_opportunity():
    data = request.get_json()
    user_id = data.get('user_id')
    opportunity_id = data.get('opportunity_id')
    notes = data.get('notes', '')

    if not user_id or not opportunity_id:
        return jsonify({'error': 'Missing required fields'}), 400

    # Check if user and opportunity exist
    user = User.query.get(user_id)
    opportunity = Opportunity.query.get(opportunity_id)

    if not user or not opportunity:
        return jsonify({'error': 'Invalid user or opportunity'}), 404

    # Check if already applied
    existing_application = Application.query.filter_by(
        user_id=user_id,
        opportunity_id=opportunity_id
    ).first()

    if existing_application:
        return jsonify({'error': 'Already applied to this opportunity'}), 400

    # Create new application
    application = Application(
        user_id=user_id,
        opportunity_id=opportunity_id,
        notes=notes
    )
    db.session.add(application)
    db.session.commit()

    return jsonify({'message': 'Application submitted successfully'}), 201

@app.route('/api/admin/applications', methods=['GET'])
def get_applications():
    applications = Application.query.all()
    return jsonify([{
        'id': app.id,
        'user': User.query.get(app.user_id).username,
        'opportunity': Opportunity.query.get(app.opportunity_id).title,
        'status': app.status,
        'created_at': app.created_at.isoformat(),
        'notes': app.notes
    } for app in applications])

@app.route('/api/admin/applications/<int:application_id>', methods=['PUT'])
def update_application_status(application_id):
    data = request.get_json()
    new_status = data.get('status')
    
    if new_status not in ['pending', 'approved', 'rejected']:
        return jsonify({'error': 'Invalid status'}), 400

    application = Application.query.get(application_id)
    if not application:
        return jsonify({'error': 'Application not found'}), 404

    application.status = new_status
    db.session.commit()

    return jsonify({'message': 'Application status updated successfully'})

def init_db():
    with app.app_context():
        db.drop_all()
        db.create_all()
        add_sample_opportunities()
        print('Database initialized with sample opportunities')
        # Print all opportunities for verification
        opportunities = Opportunity.query.all()
        print(f'Total opportunities in database: {len(opportunities)}')
        for opp in opportunities:
            print(f'- {opp.title} in {opp.location} (Skills: {opp.required_skills})')

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
 