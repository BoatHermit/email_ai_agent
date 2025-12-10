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
    # Elasticsearch
    ELASTICSEARCH_URL: str = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    ELASTICSEARCH_INDEX_EMAILS: str = os.getenv("ELASTICSEARCH_INDEX_EMAILS", "emails_ai")


settings = Settings()
