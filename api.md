# API 文档（中文）

所有接口基于 HTTP/JSON，需在请求头携带 `X-User-Id` 表示当前用户。除特别说明外，响应默认 200，错误请按实际异常处理。当前未实现鉴权逻辑。

## Chat / 问答

### POST /ai/ask
- 作用：对话式问答，调用工具并返回答案。
- 请求体：
  ```json
  {
    "question": "string",
    "current_thread_id": "string|null",
    "chat_id": "string"  // 同一 chat_id 共享历史记录并自动生成会话标题
  }
  ```
- 响应体：
  ```json
  {
    "answer": "string",
    "sources": [
      {"email_id": 1, "snippet": "text", "score": 0.87}
    ]
  }
  ```
- 说明：
  - 同一 `chat_id` 会自动保存聊天消息；首次提问会生成并保存会话标题。
  - 历史记录会注入 LLM，提升上下文连贯性。

## 邮件导入（通用）

### POST /emails/ingest
- 作用：批量导入邮件，写入数据库并建立搜索索引。
- 请求体：`EmailIngestRequest`（包含邮件数组，字段见 `app/schemas/email.py`）。
- 响应体：`{"ingested": <int>}`

### GET /emails
- 作用：分页查询当前用户的邮件，按时间逆序排列。
- 查询参数：
  - `page`（默认 1，>=1）
  - `page_size`（默认 20，1~100）
- 响应体：
  ```json
  {
    "items": [
      {
        "id": 1,
        "external_id": "ext-1",
        "thread_id": "thread-1",
        "subject": "...",
        "sender": "a@example.com",
        "recipients": ["b@example.com"],
        "cc": [],
        "bcc": [],
        "labels": [],
        "body_snippet": "前 200 字符摘要",
        "ts": "ISO8601",
        "importance_score": 0.0,
        "is_promotion": false
      }
    ],
    "total": 123,
    "page": 1,
    "page_size": 20
  }
  ```

## Gmail 同步

### POST /gmail/connect
- 作用：首次接入，拉取最近 N 天邮件，保存 `historyId` 供增量。
- 请求体：
  ```json
  {
    "access_token": "string",
    "refresh_token": "string|null",
    "days_back": 90
  }
  ```
- 响应体：
  ```json
  {
    "ingested": 123,
    "history_id": "string|null",
    "last_synced_at": "ISO8601|null"
  }
  ```

### POST /gmail/sync
- 作用：增量同步。优先使用保存的 `historyId`；不存在则回退抓取最近 fallback 天。
- 请求体：
  ```json
  {
    "access_token": "string|null",
    "refresh_token": "string|null",
    "fallback_days_back": 7
  }
  ```
- 响应体同上（`history_id` 表示最新游标）。

## Outlook 同步

### POST /outlook/connect
- 作用：首次接入，拉取最近 N 天邮件，保存 `delta_link` 供增量。
- 请求体：
  ```json
  {
    "access_token": "string",
    "refresh_token": "string|null",
    "days_back": 90
  }
  ```
- 响应体：
  ```json
  {
    "ingested": 123,
    "delta_link": "string|null",
    "last_synced_at": "ISO8601|null"
  }
  ```

### POST /outlook/sync
- 作用：增量同步。优先使用保存的 `delta_link`；不存在则回退抓取最近 fallback 天。
- 请求体：
  ```json
  {
    "access_token": "string|null",
    "refresh_token": "string|null",
    "fallback_days_back": 7
  }
  ```
- 响应体同上（`delta_link` 表示最新游标）。

## 全量导入（批处理）

### POST /ingestion/full/start
- 作用：创建全量导入会话，返回 `session_id` 供后续分批上传。
- 请求体：`FullIngestionStartRequest`（`provider` 等字段见 `app/schemas/ingestion.py`）。
- 响应体：`FullIngestionStartResponse`（包含 `session_id`、`status`、`checkpoint_token` 等）。

### POST /ingestion/full/batch
- 作用：向会话追加一批邮件，可附上外部游标。
- 请求体：`FullIngestionBatchRequest`（含 `session_id`、`emails`、`next_checkpoint`、`mark_completed`）。
- 响应体：`FullIngestionBatchResponse`（本批新增量、累计量、状态、`checkpoint_token`）。

### GET /ingestion/full/{session_id}
- 作用：查询某全量导入会话状态（用于断点续传）。
- 响应体：`FullIngestionStatusResponse`（状态、`checkpoint_token`、`processed_count`、`last_error` 等）。

## 同步状态持久化
- 状态表：`mailbox_sync_state`（`provider`="gmail"/"outlook"），持久保存 `access_token`、`refresh_token`、`delta_link/historyId`、`last_synced_at`，用于增量续传。
- 聊天表：`chat_messages`、`chat_sessions`，按 `chat_id` 记录消息和生成的标题。
