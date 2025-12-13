import sys
import os
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session

# Add the project root to sys.path to allow importing app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal, engine
from app.db.models import Email, Base

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def ingest_mock_emails(json_file_path: str):
    if not os.path.exists(json_file_path):
        logger.error(f"File not found: {json_file_path}")
        return

    logger.info(f"Reading mock emails from {json_file_path}")
    
    with open(json_file_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode JSON: {e}")
            return

    if not isinstance(data, list):
        logger.error("JSON data is not a list of emails")
        return

    db: Session = SessionLocal()
    
    # Ensure tables exist (though they likely do)
    Base.metadata.create_all(bind=engine)

    count = 0
    for item in data:
        try:
            # Check if email already exists (by external_id and user_id)
            existing = db.query(Email).filter(
                Email.external_id == item.get("external_id"),
                Email.user_id == item.get("user_id")
            ).first()

            if existing:
                logger.info(f"Skipping existing email: {item.get('external_id')}")
                continue

            # Parse timestamp
            ts_str = item.get("ts")
            ts = datetime.fromisoformat(ts_str) if ts_str else datetime.utcnow()

            email = Email(
                user_id=item.get("user_id"),
                external_id=item.get("external_id"),
                thread_id=item.get("thread_id"),
                subject=item.get("subject"),
                sender=item.get("sender"),
                recipients=item.get("recipients"),
                cc=item.get("cc"),
                bcc=item.get("bcc"),
                body_text=item.get("body_text"),
                raw_headers=item.get("raw_headers"),
                labels=item.get("labels"),
                ts=ts,
                importance_score=item.get("importance_score", 0.0),
                is_promotion=item.get("is_promotion", 0)
            )
            db.add(email)
            count += 1
        except Exception as e:
            logger.error(f"Error processing item {item.get('external_id')}: {e}")
            continue

    try:
        db.commit()
        logger.info(f"Successfully ingested {count} emails.")
    except Exception as e:
        logger.error(f"Error committing to database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Assuming the script is run from the scripts directory or root, 
    # and mock_email.json is in the root.
    
    # Try to find the file relative to the script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    file_path = os.path.join(project_root, "mock_email.json")
    
    ingest_mock_emails(file_path)
