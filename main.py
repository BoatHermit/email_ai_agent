from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import random
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, JSON, Boolean, desc
from sqlalchemy.orm import sessionmaker, declarative_base

app = Flask(__name__, static_folder='dashboard/dist', static_url_path='')
CORS(app)

# --- Database Setup ---
DASHBOARD_DB_URL = "sqlite:///./dashboard.db"
ACTION_DB_URL = "sqlite:///./action.db"  # Added Action DB URL

DashboardBase = declarative_base()
ActionBase = declarative_base() # Added Action Base

class ProcessedEmail(DashboardBase):
    __tablename__ = "processed_emails"

    id = Column(Integer, primary_key=True, index=True)
    original_id = Column(Integer, unique=True, index=True)
    user_id = Column(String, index=True)
    
    subject = Column(String)
    sender = Column(String)
    received_at = Column(DateTime)
    body_text = Column(Text)
    
    main_type_key = Column(String)
    sub_type_key = Column(String)
    quadrant = Column(String)
    quadrant_reason = Column(Text)
    summary = Column(Text)
    keywords = Column(JSON)
    need_action = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False) # Added is_read field
    
    processed_at = Column(DateTime, default=datetime.utcnow)

class EmailAction(ActionBase): # Added EmailAction Model
    __tablename__ = "email_actions"
    id = Column(Integer, primary_key=True, index=True)
    processed_email_id = Column(Integer, unique=True, index=True)
    original_id = Column(Integer, index=True)
    actions_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

dashboard_engine = create_engine(DASHBOARD_DB_URL)
DashboardSession = sessionmaker(bind=dashboard_engine)

action_engine = create_engine(ACTION_DB_URL) # Added Action Engine
ActionSession = sessionmaker(bind=action_engine) # Added Action Session

# Serve React App
@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

# Global storage
USER_SETTINGS = {
    "username": "User",
    "avatar": "👤",
    "notifications": True,
    "email_types": [
        {"id": "request", "name": "Request", "description": "User requests for information or action"},
        {"id": "confirmation", "name": "Confirmation", "description": "Confirmation of requests or actions"},
        {"id": "task", "name": "Task", "description": "Specific tasks to be executed"},
        {"id": "reminder", "name": "Reminder", "description": "Reminders for upcoming events"},
        {"id": "newsletter", "name": "Newsletter", "description": "News, announcements, or marketing content"},
        {"id": "complaint", "name": "Complaint", "description": "Feedback, complaints, or issue reports"},
        {"id": "personal", "name": "Personal", "description": "Personal correspondence"},
        {"id": "event_meeting", "name": "Event/Meeting", "description": "Events, meetings, and scheduling"}
    ]
}

@app.route('/api/emails', methods=['GET'])
def get_emails():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    filter_type = request.args.get('type', 'all')
    
    session = DashboardSession()
    action_session = ActionSession() # Open Action Session
    try:
        query = session.query(ProcessedEmail)
        
        if filter_type != 'all':
            query = query.filter(ProcessedEmail.main_type_key == filter_type)
            
        total_emails = query.count()
        total_pages = (total_emails + per_page - 1) // per_page
        
        emails = query.order_by(desc(ProcessedEmail.received_at))\
                      .offset((page - 1) * per_page)\
                      .limit(per_page)\
                      .all()
        
        # Fetch all actions for these emails in one go to avoid N+1
        email_ids = [e.id for e in emails]
        actions_map = {}
        
        # Fetch all actions to ensure consistency with categorized view
        # In a production app with millions of rows, we should use the ID filter, 
        # but for this scale, fetching all is safer to avoid any potential ID mismatch issues
        actions = action_session.query(EmailAction).all()
        for a in actions:
            if a.actions_data and "actions" in a.actions_data:
                actions_map[a.processed_email_id] = a.actions_data["actions"]

        email_list = []
        for email in emails:
            real_actions = actions_map.get(email.id, [])
            
            email_list.append({
                "id": email.id,
                "sender": email.sender,
                "title": email.subject,
                "time": email.received_at.isoformat() if email.received_at else None,
                "keywords": email.keywords or [],
                "summary": email.summary or "",
                "content": email.body_text or email.summary or "", 
                "actions": real_actions if real_actions else [],
                "importance": "high" if "important" in (email.quadrant or "") else "low",
                "urgency": "urgent" if "urgent" in (email.quadrant or "") else "not-urgent",
                "is_archived": False,
                "is_read": email.is_read, # Added is_read
                "type": email.main_type_key,
                "quadrant": email.quadrant,
                "quadrant_reason": email.quadrant_reason
            })
            
        return jsonify({
            'emails': email_list,
            'total_pages': total_pages,
            'current_page': page
        })
    finally:
        session.close()
        action_session.close() # Close Action Session

@app.route('/api/emails/<int:email_id>', methods=['GET'])
def get_email(email_id):
    session = DashboardSession()
    action_session = ActionSession()
    try:
        email = session.query(ProcessedEmail).filter(ProcessedEmail.id == email_id).first()
        if email:
            real_actions = []
            action_record = action_session.query(EmailAction).filter(EmailAction.processed_email_id == email.id).first()
            if action_record and action_record.actions_data and "actions" in action_record.actions_data:
                real_actions = action_record.actions_data["actions"]

            return jsonify({
                'success': True,
                'email': {
                    "id": email.id,
                    "sender": email.sender,
                    "title": email.subject,
                    "time": email.received_at.isoformat() if email.received_at else None,
                    "keywords": email.keywords or [],
                    "summary": email.summary or "",
                    "content": email.body_text or email.summary or "",
                    "actions": real_actions if real_actions else [],
                    "importance": "high" if "important" in (email.quadrant or "") else "low",
                    "urgency": "urgent" if "urgent" in (email.quadrant or "") else "not-urgent",
                    "is_archived": False,
                    "is_read": email.is_read, # Added is_read
                    "type": email.main_type_key,
                    "quadrant": email.quadrant,
                    "quadrant_reason": email.quadrant_reason
                }
            })
        return jsonify({
            'success': False,
            'message': 'Email not found'
        }, 404)
    finally:
        session.close()
        action_session.close()

@app.route('/api/emails/categorized', methods=['GET'])
def get_categorized_emails():
    status_filter = request.args.get('status', 'all') # 'all', 'read', 'unread'
    
    session = DashboardSession()
    action_session = ActionSession()
    try:
        query = session.query(ProcessedEmail)
        
        if status_filter == 'unread':
            query = query.filter(ProcessedEmail.is_read == False)
        elif status_filter == 'read':
            query = query.filter(ProcessedEmail.is_read == True)
            
        emails = query.all()
        
        # Fetch all actions
        actions_map = {}
        all_actions = action_session.query(EmailAction).all()
        for a in all_actions:
             if a.actions_data and "actions" in a.actions_data:
                actions_map[a.processed_email_id] = a.actions_data["actions"]

        categorized = {
            "urgent_important": [],
            "urgent_not_important": [],
            "not_urgent_important": [],
            "not_urgent_not_important": []
        }
        
        for email in emails:
            real_actions = actions_map.get(email.id, [])

            email_data = {
                "id": email.id,
                "sender": email.sender,
                "title": email.subject,
                "time": email.received_at.isoformat() if email.received_at else None,
                "keywords": email.keywords,
                "summary": email.summary,
                "content": email.body_text or email.summary,
                "actions": real_actions if real_actions else [],
                "importance": "high" if "important" in (email.quadrant or "") else "low",
                "urgency": "urgent" if "urgent" in (email.quadrant or "") else "not-urgent",
                "is_archived": False,
                "is_read": email.is_read, # Return is_read status
                "type": email.main_type_key,
                "quadrant": email.quadrant,
                "quadrant_reason": email.quadrant_reason
            }
            
            if email.quadrant in categorized:
                categorized[email.quadrant].append(email_data)
            else:
                # Fallback for undefined quadrants
                categorized["not_urgent_not_important"].append(email_data)
                
        return jsonify({
            'success': True,
            'categories': categorized
        })
    finally:
        session.close()
        action_session.close()

@app.route('/api/emails/<int:email_id>/read', methods=['POST'])
def mark_email_read(email_id):
    """Mark an email as read"""
    session = DashboardSession()
    try:
        email = session.query(ProcessedEmail).filter(ProcessedEmail.id == email_id).first()
        if email:
            email.is_read = True
            session.commit()
            return jsonify({'success': True, 'message': 'Email marked as read'})
        return jsonify({'success': False, 'message': 'Email not found'}), 404
    except Exception as e:
        session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()

@app.route('/api/emails/<int:email_id>/archive', methods=['POST'])
def archive_email(email_id):
    """Archive/Mark as done an email"""
    # For now, we don't actually delete from DB in this demo, or we could add an 'archived' flag
    # But since we are reading from ProcessedEmail, let's just return success
    return jsonify({
        'success': True,
        'message': 'Email archived'
    })

@app.route('/api/login', methods=['POST'])
def login():
    """Login endpoint - currently just records username"""
    data = request.json
    username = data.get('username', '')
    USER_SETTINGS['username'] = username
    return jsonify({
        'success': True,
        'username': username,
        'message': 'Login successful'
    })

@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify({
        'success': True,
        'settings': USER_SETTINGS
    })

@app.route('/api/settings/update', methods=['POST'])
def update_settings():
    """Update user profile settings"""
    data = request.json
    if 'username' in data:
        USER_SETTINGS['username'] = data['username']
    if 'notifications' in data:
        USER_SETTINGS['notifications'] = data['notifications']
    if 'avatar' in data:
        USER_SETTINGS['avatar'] = data['avatar']
    return jsonify({
        'success': True,
        'settings': USER_SETTINGS
    })

@app.route('/api/settings/types', methods=['POST'])
def add_email_type():
    """Add a new email type"""
    data = request.json
    new_type = {
        "id": data.get('name'), # Simple ID generation
        "name": data.get('name'),
        "description": data.get('description', '')
    }
    
    # Check if exists
    if not any(t['id'] == new_type['id'] for t in USER_SETTINGS['email_types']):
        USER_SETTINGS['email_types'].append(new_type)
        return jsonify({'success': True, 'settings': USER_SETTINGS})
    
    return jsonify({'success': False, 'message': 'Type already exists'}), 400

@app.route('/api/settings/types/<type_id>', methods=['DELETE'])
def delete_email_type(type_id):
    """Delete an email type"""
    USER_SETTINGS['email_types'] = [t for t in USER_SETTINGS['email_types'] if t['id'] != type_id]
    return jsonify({'success': True, 'settings': USER_SETTINGS})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
