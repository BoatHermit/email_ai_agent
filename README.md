# Email AI Agent

A reference implementation of a Shortwave-like email AI assistant:

- Tool selection (EmailHistory, CurrentThread, Calendar, Compose)
- AI Search (query reformulation, feature extraction, hybrid search, reranking)
- Single LLM call to answer questions with all context.

## Run
fill in .env.example
```bash
pip install -r requirements.txt
cp .env.example .env  # fill in keys
uvicorn app.main:app --reload
```

## Frontend

简单静态页，直接本地起一个静态服务器即可：

```bash
cd web
python -m http.server 3000
```
