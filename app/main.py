from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import ai, auth, emails, gmail, ingestion, mailbox, outlook
from app.db import models
from app.db.base import Base
from app.db.session import engine
from app.services.search_index_es import ensure_email_index

# åˆ›å»º DB è¡?
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Email AI Agent (Shortwave-style) with ES & Multitenancy")

# Allow local web frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestion.router)
app.include_router(emails.router)
app.include_router(ai.router)
app.include_router(outlook.router)
app.include_router(gmail.router)
app.include_router(mailbox.router)
app.include_router(auth.router)


@app.on_event("startup")
def on_startup():
    # åˆå§‹åŒ– ES ç´¢å¼•
    ensure_email_index()
