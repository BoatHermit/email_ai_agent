# Email AI Agent

Shortwave-style email AI assistant with ingestion, hybrid search, and tool-based answering.

## What It Does
- Full email ingestion for Outlook and Gmail with checkpointed batches and multi-tenant SQLite/SQLAlchemy storage.
- Hybrid AI Search (query rewrite → feature extraction → embedding + Elasticsearch hybrid search → heuristic rerank) that returns scored snippets.
- Tool selection per question (EmailHistory, CurrentThread) and a single LLM call that stitches tool outputs into an answer with citations.
- Chat session history and titles to keep multi-turn context for follow-up questions.
- Simple static web client that can call the FastAPI backend.

## Pipelines
- **Ingestion**: Client starts a full ingestion session → sends batched emails (with checkpoint tokens) → service deduplicates by user + external id, writes to DB, indexes into Elasticsearch, and tracks progress/errors on the session.
- **Question Answering**: LLM chooses tools → tools fetch email history/current thread/calendar data → AI Search reformulates and retrieves top matches → tool contexts are merged into one prompt → single LLM completion returns the answer plus source fragments for display.

## Run
Fill out `.env` (copy from `.env.example`) with OpenAI/Gemini keys and Elasticsearch URL.
```bash
pip install -r requirements.txt
cp .env.example .env  # fill in keys
uvicorn app.main:app --reload
```

## Frontend
Simple static page; serve locally and hit the API.
```bash
cd web
python -m http.server 3000
```
