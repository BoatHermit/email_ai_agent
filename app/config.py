import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL_GPT: str = os.getenv("OPENAI_MODEL_GPT", "gpt-4.1-mini")
    OPENAI_MODEL_EMBEDDING: str = os.getenv("OPENAI_MODEL_EMBEDDING", "text-embedding-3-large")
    OPENAI_PROXY: str = os.getenv("OPENAI_PROXY", None)
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./email_ai.db")
    ENABLE_CROSS_ENCODER: bool = os.getenv("ENABLE_CROSS_ENCODER", "false").lower() == "true"
    AUTH_SECRET: str = os.getenv("AUTH_SECRET", "change-me")
    AUTH_TOKEN_TTL_SECONDS: int = int(os.getenv("AUTH_TOKEN_TTL_SECONDS", str(60 * 60 * 24 * 30)))
    # Elasticsearch
    ELASTICSEARCH_URL: str = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    ELASTICSEARCH_INDEX_EMAILS: str = os.getenv("ELASTICSEARCH_INDEX_EMAILS", "emails_ai")
    # Outlook / Microsoft Graph
    OUTLOOK_GRAPH_BASE_URL: str = os.getenv("OUTLOOK_GRAPH_BASE_URL", "https://graph.microsoft.com/v1.0")
    OUTLOOK_PAGE_SIZE: int = int(os.getenv("OUTLOOK_PAGE_SIZE", "50"))
    # Gmail
    GMAIL_API_BASE_URL: str = os.getenv("GMAIL_API_BASE_URL", "https://gmail.googleapis.com/gmail/v1")
    GMAIL_PAGE_SIZE: int = int(os.getenv("GMAIL_PAGE_SIZE", "100"))


settings = Settings()
