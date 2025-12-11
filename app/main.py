from fastapi import FastAPI

from app.api import ai, emails, gmail, ingestion, outlook
from app.db import models
from app.db.base import Base
from app.db.session import engine
from app.services.search_index_es import ensure_email_index

# åˆ›å»º DB è¡?
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Email AI Agent (Shortwave-style) with ES & Multitenancy")

app.include_router(ingestion.router)
app.include_router(emails.router)
app.include_router(ai.router)
app.include_router(outlook.router)
app.include_router(gmail.router)


@app.on_event("startup")
def on_startup():
    # åˆå§‹åŒ– ES ç´¢å¼•
    ensure_email_index()
