import sys
import os
import json
import logging
import argparse
from datetime import datetime
from typing import List, Optional

# Add the project root to sys.path to allow importing app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, JSON, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings
from app.services.llm_provider import chat_completion

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Database Setup ---
DASHBOARD_DB_URL = "sqlite:///./dashboard.db"
ACTION_DB_URL = "sqlite:///./action.db"

Base = declarative_base()

# Define ProcessedEmail to read from dashboard.db
# We redefine it here to match the schema in dashboard.db without importing from the other script
class ProcessedEmail(Base):
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
    processed_at = Column(DateTime, default=datetime.utcnow)

# Define EmailAction to write to action.db
class EmailAction(Base):
    __tablename__ = "email_actions"
    id = Column(Integer, primary_key=True, index=True)
    processed_email_id = Column(Integer, unique=True, index=True) # Link to dashboard.db id
    original_id = Column(Integer, index=True) # Link to raw email id
    
    # The full JSON response from the LLM containing the actions list
    # Expected structure: {"need_action": bool, "actions": [...]}
    actions_data = Column(JSON) 
    
    created_at = Column(DateTime, default=datetime.utcnow)

# Create engines
# Note: dashboard.db is expected to exist. action.db will be created if not exists.
dashboard_engine = create_engine(DASHBOARD_DB_URL)
action_engine = create_engine(ACTION_DB_URL)

# Create tables for action.db
# We only create tables for EmailAction. ProcessedEmail table is assumed to exist in dashboard.db
# However, Base.metadata.create_all will try to create all tables in Base.
# Since we are using two different engines, we need to be careful.
# We should bind the create_all to the specific engine and only create the relevant table if possible,
# or just use separate Bases. Using separate Bases is cleaner.

ActionBase = declarative_base()

class EmailActionModel(ActionBase):
    __tablename__ = "email_actions"
    id = Column(Integer, primary_key=True, index=True)
    processed_email_id = Column(Integer, unique=True, index=True)
    original_id = Column(Integer, index=True)
    actions_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

ActionBase.metadata.create_all(action_engine)

DashboardSession = sessionmaker(bind=dashboard_engine)
ActionSession = sessionmaker(bind=action_engine)

def load_prompt_template():
    # action_prompt.txt is in the project root
    prompt_path = os.path.join(os.path.dirname(__file__), 'action_prompt.txt')
    try:
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"Prompt file not found at {prompt_path}")
        sys.exit(1)

def generate_actions_for_email(email: ProcessedEmail, system_prompt_template: str) -> Optional[dict]:
    # Construct CLASSIFICATION_RESULT
    classification_result = {
        "main_type_key": email.main_type_key,
        "sub_type_key": email.sub_type_key,
        "quadrant": email.quadrant,
        "quadrant_reason": email.quadrant_reason,
        "keywords": email.keywords,
        "summary": email.summary,
        "need_action": email.need_action
    }
    
    # Construct User Prompt
    # We append the specific email details to the system prompt instructions
    user_prompt = f"""
[CLASSIFICATION_RESULT]
{json.dumps(classification_result, ensure_ascii=False, indent=2)}

[EMAIL META]
Subject: {email.subject}
Sender: {email.sender}
Date: {str(email.received_at)}

[EMAIL BODY]
{email.body_text[:3000] if email.body_text else ""} 
"""
    
    try:
        response = chat_completion(
            system_prompt=system_prompt_template,
            user_prompt=user_prompt,
            response_format={"type": "json_object"}
        )
        
        content = response.get("content")
        if not content:
            raise ValueError("Empty response from LLM")
            
        return json.loads(content)
    except Exception as e:
        logger.error(f"Error generating actions for email {email.id}: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Generate actions for processed emails.")
    parser.add_argument("--verbose", action="store_true", help="Show progress logs")
    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.INFO)

    dashboard_session = DashboardSession()
    action_session = ActionSession()
    
    try:
        # 1. Get IDs of emails that already have actions generated
        existing_action_ids = {id_ for (id_,) in action_session.query(EmailActionModel.processed_email_id).all()}
        
        # 2. Fetch emails from dashboard.db that need action and haven't been processed yet
        emails_to_process = dashboard_session.query(ProcessedEmail).filter(
            ProcessedEmail.need_action == True,
            ProcessedEmail.id.notin_(existing_action_ids)
        ).all()
        
        logger.info(f"Found {len(emails_to_process)} emails needing action generation.")
        
        if not emails_to_process:
            return

        # Load prompt
        prompt_template = load_prompt_template()

        for email in emails_to_process:
            logger.info(f"Generating actions for email ID: {email.id} - {email.subject[:30]}...")
            
            actions_json = generate_actions_for_email(email, prompt_template)
            
            if not actions_json:
                logger.warning(f"Skipping email ID {email.id} due to generation failure.")
                continue
            
            # Create EmailAction record
            email_action = EmailActionModel(
                processed_email_id=email.id,
                original_id=email.original_id,
                actions_data=actions_json
            )
            
            action_session.add(email_action)
            try:
                action_session.commit()
                logger.info(f"Successfully saved actions for email ID: {email.id}")
            except Exception as e:
                action_session.rollback()
                logger.error(f"Failed to save actions for email ID {email.id}: {e}")

    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        dashboard_session.close()
        action_session.close()

if __name__ == "__main__":
    main()
