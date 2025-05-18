# Volunteer Matching Service

A full-stack web application that connects volunteers with organizations offering opportunities to serve.

## Features

- User registration and login
- Search opportunities by skills and location
- Modern and responsive UI
- SQLite database for data storage
- RESTful API backend

## Setup

1. Install Python requirements:
```bash
pip install -r requirements.txt
```

2. Run the Flask application:
```bash
python app.py
```

3. Open your browser and navigate to:
```
http://localhost:5000
```

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Python (Flask)
- Database: SQLite
- Additional: Flask-SQLAlchemy, Flask-Login, Flask-CORS

## API Endpoints

- POST /api/register - Register new user
- POST /api/login - User login
- GET /api/opportunities - Search opportunities
