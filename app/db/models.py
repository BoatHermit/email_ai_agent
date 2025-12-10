from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Float, Index
from sqlalchemy.dialects.sqlite import BLOB
from datetime import datetime

from app.db.base import Base


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)

    # 多租户关键字段
    user_id = Column(String, index=True)

    external_id = Column(String, index=True)  # 不再强制 unique，允许不同 user 相同 external_id
    thread_id = Column(String, index=True)
    subject = Column(String, index=True)
    sender = Column(String, index=True)
    recipients = Column(String)  # comma separated
    cc = Column(String, nullable=True)
    bcc = Column(String, nullable=True)
    body_text = Column(Text)
    raw_headers = Column(JSON, nullable=True)
    labels = Column(String, nullable=True)  # comma separated
    ts = Column(DateTime, default=datetime.utcnow, index=True)

    # 旧版遗留字段，当前实现不再使用
    embedding = Column(BLOB, nullable=True)

    importance_score = Column(Float, default=0.0)
    is_promotion = Column(Integer, default=0)  # 0 or 1


# 组合索引，强化隔离和查询效率
Index("ix_email_user_external", Email.user_id, Email.external_id)
Index("ix_email_user_thread", Email.user_id, Email.thread_id)


class CurrentThreadContext(Base):
    __tablename__ = "current_thread_context"

    id = Column(Integer, primary_key=True)
    user_id = Column(String, index=True)
    thread_id = Column(String, index=True)
    context_text = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow)


class IngestionSession(Base):
    """
    用于首次全量导入的会话状态，支持断点续传。
    一般对应某个 user + provider（例如 gmail）。
    """
    __tablename__ = "ingestion_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    provider = Column(String, index=True)  # 比如 "gmail", "imap", "shortwave"

    # 当前会话状态: "in_progress" | "completed" | "failed"
    status = Column(String, default="in_progress", index=True)

    # 外部邮箱服务的游标，比如 Gmail 的 nextPageToken / historyId
    checkpoint_token = Column(String, nullable=True)

    # 已处理邮件数量（成功写入/已存在的 email 数）
    processed_count = Column(Integer, default=0)

    # 可记录 last_error 帮助排错
    last_error = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)