import sys
import os
import json
import logging
from collections import defaultdict
from datetime import datetime
from sqlalchemy.orm import Session

# Add the project root to sys.path to allow importing app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal, engine
from app.db.models import Email, Base
from app.schemas.email import EmailIngestItem
from app.services.email_ingest import ingest_emails

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def _split_csv_field(value: str | None) -> list[str]:
    """Split a comma-separated string into a trimmed list."""
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def _to_ingest_item(raw: dict) -> EmailIngestItem:
    """Convert raw JSON dict to EmailIngestItem."""
    ts_str = raw.get("ts")
    ts = datetime.fromisoformat(ts_str) if ts_str else datetime.utcnow()
    return EmailIngestItem(
        external_id=raw.get("external_id", ""),
        thread_id=raw.get("thread_id", ""),
        subject=raw.get("subject", ""),
        sender=raw.get("sender", ""),
        recipients=_split_csv_field(raw.get("recipients")),
        cc=_split_csv_field(raw.get("cc")) or None,
        bcc=_split_csv_field(raw.get("bcc")) or None,
        body_text=raw.get("body_text", ""),
        labels=_split_csv_field(raw.get("labels")) or None,
        ts=ts,
        importance_score=float(raw.get("importance_score", 0.0) or 0.0),
        is_promotion=bool(raw.get("is_promotion", 0)),
    )


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

    grouped: dict[str, list[EmailIngestItem]] = defaultdict(list)
    for item in data:
        try:
            user_id = item.get("user_id")
            if not user_id:
                logger.warning(f"Skipping item without user_id: {item}")
                continue
            ingest_item = _to_ingest_item(item)
            grouped[user_id].append(ingest_item)
        except Exception as e:
            logger.error(f"Error parsing item {item.get('external_id')}: {e}")
            continue

    total_ingested = 0
    try:
        for user_id, items in grouped.items():
            ingested = ingest_emails(db, user_id, items)
            total_ingested += ingested
            logger.info(f"Ingested {ingested} emails for user {user_id}.")
        logger.info(f"Successfully ingested {total_ingested} emails in total.")
    except Exception as e:
        logger.error(f"Error ingesting emails: {e}")
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
