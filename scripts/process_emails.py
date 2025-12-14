import sys
import os
import json
import logging
import argparse
from datetime import datetime
from typing import List, Optional

# Add the project root to sys.path to allow importing app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, JSON, Boolean, select
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import IntegrityError

from app.db.models import Email as RawEmail
from app.config import settings
from app.services.llm_provider import chat_completion

# Setup logging
logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- New Database Setup ---
# We will use a separate SQLite database for the processed data
DASHBOARD_DB_URL = "sqlite:///./dashboard.db"
DashboardBase = declarative_base()

class ProcessedEmail(DashboardBase):
    __tablename__ = "processed_emails"

    id = Column(Integer, primary_key=True, index=True)
    original_id = Column(Integer, unique=True, index=True)  # ID from the raw emails DB
    user_id = Column(String, index=True)
    
    # Basic info copied/normalized from raw email
    subject = Column(String)
    sender = Column(String)
    received_at = Column(DateTime)
    body_text = Column(Text)
    
    # AI Analyzed fields
    main_type_key = Column(String)
    sub_type_key = Column(String)
    quadrant = Column(String)
    quadrant_reason = Column(Text)
    summary = Column(Text)
    keywords = Column(JSON)
    need_action = Column(Boolean, default=False)
    
    processed_at = Column(DateTime, default=datetime.utcnow)

# Create engine and tables for dashboard DB
dashboard_engine = create_engine(DASHBOARD_DB_URL)
DashboardBase.metadata.create_all(dashboard_engine)
DashboardSession = sessionmaker(bind=dashboard_engine)

# --- Old Database Setup ---
# Connect to the existing email_ai.db
# We can reuse the engine setup from app.db.session but we want to be explicit here
raw_engine = create_engine(settings.DATABASE_URL)
RawSession = sessionmaker(bind=raw_engine)

# --- Configuration & Prompts ---

EMAIL_TYPE_REGISTRY = {
    "request": {
        "key": "request",
        "zh_name": "请求",
        "description": "用户请求信息或行动（例如：询问、客户支持请求等）。",
        "aliases": ["请求", "咨询", "问询"]
    },
    "confirmation": {
        "key": "confirmation",
        "zh_name": "确认",
        "description": "确认某个请求或行动（例如：订单确认、预约确认等）。"
    },
    "task": {
        "key": "task",
        "zh_name": "任务",
        "description": "涉及需要执行的具体任务（例如：项目任务、待办事项等）。"
    },
    "reminder": {
        "key": "reminder",
        "zh_name": "提醒",
        "description": "提醒即将发生的事项（例如：会议、重要截止日期等）。"
    },
    "newsletter": {
        "key": "newsletter",
        "zh_name": "新闻通讯",
        "description": "来自公司或组织的新闻、公告或营销内容。"
    },
    "complaint": {
        "key": "complaint",
        "zh_name": "投诉",
        "description": "表达不满、意见反馈或问题报告。"
    },
    "personal": {
        "key": "personal",
        "zh_name": "个人",
        "description": "私人性质的邮件（朋友、家人、私人对话等）。"
    },
    "event_meeting": {
        "key": "event_meeting",
        "zh_name": "事件/会议",
        "description": "与事件、会议、日程安排相关的邮件。"
    },
}

PROMPT_TEMPLATE = """
你是一个专业的“邮件信息抽取与时间管理助手”。

【总体任务】
给定一封邮件的元信息（发件人、收件人、标题、时间等）、正文内容，以及一份“邮件类型注册表”（EMAIL_TYPE_REGISTRY），你需要：

1. 从 EMAIL_TYPE_REGISTRY 中选择一个 main_type_key 和一个 sub_type_key。
2. 判断邮件在四象限时间管理矩阵中的位置（quadrant），并给出简短理由（quadrant_reason）。
3. 提取 3-5 个关键词（keywords）。
4. 用 1-3 句话总结邮件内容（summary）。
5. 判断收件人是否需要采取行动（need_action）。

你的输出只允许是一个 JSON 对象，不要输出任何额外说明文字。

--------------------
【EMAIL_TYPE_REGISTRY】
{EMAIL_TYPE_REGISTRY_JSON}

- 你必须遵守以下规则：
  1. main_type_key 和 sub_type_key 必须从 EMAIL_TYPE_REGISTRY 的 key 中选择。
  2. 不能凭空创造新的 key，也不要直接使用中文标签作为 key。
  3. 判断含义时，要优先参考每个类型的 "description" 和 "aliases" 字段。
  4. 当邮件同时符合多种类型时：
     - main_type_key = 对收件人来说最核心、最需要优先考虑的用途。
     - sub_type_key = 第二重要的用途标签；如果没有明显次要用途，可以与 main_type_key 相同。

--------------------
【字段定义】

1. main_type_key（字符串）
   - 目的：标记这封邮件的“主类型”，用于统计和过滤。
   - 取值：必须是 EMAIL_TYPE_REGISTRY 的一个 key，如 "request"等。

2. sub_type_key（字符串）
   - 目的：标记次要类型，用于更精细的统计与过滤。
   - 取值：同样必须是 EMAIL_TYPE_REGISTRY 的一个 key。
   - 如果没有明显次要类型，可以与 main_type_key 相同。

3. quadrant（字符串）
   - 目的：按照四象限时间管理法，对邮件进行“紧急/重要”定位。
   - 取值限定为：
     - "urgent_important"：紧急且重要
     - "urgent_not_important"：紧急但不重要
     - "not_urgent_important"：不紧急但重要
     - "not_urgent_not_important"：不紧急且不重要
   - 判断规则：
     - 重要性：是否与收件人当前学习/工作/项目/关键目标直接相关？
     - 紧急性：是否需要在今天/几天内立即回复或采取行动？是否有明确截止日期？

4. quadrant_reason（字符串）
   - 目的：解释为什么这封邮件被判定为当前的 quadrant，增强可解释性。
   - 要求：
     - 使用中文，长度控制在 1-2 句话，语句精简。
     - 重点说明“是否有明确时间要求”和“为什么重要/不重要”。
   - 示例：
     - "邮件要求在本周内确定会议时间，并且与关键项目进展相关，因此既紧急又重要。"
     - "这是产品更新公告，没有截止时间，对当前工作影响有限，因此不紧急也不重要。"

5. keywords（字符串数组）
   - 目的：作为邮件卡片上的标签，帮助用户快速筛选与定位。
   - 要求：
     - 数量为 3-5 个。
     - 尽量是名词或短语，代表邮件的核心主题、对象或操作。
   - 示例：["会议", "项目A", "时间确认"]、["报销", "发票", "三季度", "远程办公"]。

6. summary（字符串）
   - 目的：让用户在不展开全文的情况下，立刻理解邮件的主要意思和需要做什么。
   - 要求：
     - 用 1-3 句话概括。
     - 尽量包含：发件人想要什么、是否有时间/地点/金额等关键约束。

7. need_action（布尔值）
   - 目的：驱动后续“是否生成具体动作/回复模版”的逻辑。
   - 取值：true 或 false。
   - 判断规则：
     - true：收件人需要“做点什么”（回复、确认、提交、安排等）。
     - false：纯通知、新闻通讯、一般信息知会、垃圾广告等，不需要行动。

--------------------
【输出格式要求】

- 严格输出一个 JSON 对象，键名必须为：
  - "main_type_key"
  - "sub_type_key"
  - "quadrant"
  - "quadrant_reason"
  - "keywords"
  - "summary"
  - "need_action"
- 不要在 JSON 外再输出任何额外文本（例如解释、注释或 Markdown）。

JSON 示例结构：

{{
  "main_type_key": "request",
  "sub_type_key": "event_meeting",
  "quadrant": "urgent_important",
  "quadrant_reason": "需要在本周内确认会议时间，并直接影响项目A的后续计划，因此既紧急又重要。",
  "keywords": ["项目A", "会议", "时间确认"],
  "summary": "发件人希望本周安排一次会议，与你对齐项目A的进展，并请你提供可用时间。",
  "need_action": true
}}
"""

def analyze_email(email: RawEmail) -> Optional[dict]:
    """
    Use LLM to analyze the email and return a structured JSON.
    Returns None if analysis fails.
    """
    # Prepare the system prompt with the registry
    try:
        registry_json = json.dumps(EMAIL_TYPE_REGISTRY, ensure_ascii=False, indent=2)
        system_prompt = PROMPT_TEMPLATE.format(EMAIL_TYPE_REGISTRY_JSON=registry_json)
    except Exception as e:
        logger.error(f"Error formatting prompt: {e}")
        # Fallback prompt
        system_prompt = """
        You are an intelligent email assistant. Analyze the email and extract structured info.
        Output JSON with: main_type_key, sub_type_key, quadrant, quadrant_reason, keywords, summary, need_action.
        """

    # Construct a representation of the email
    email_content = f"""
    Subject: {email.subject}
    Sender: {email.sender}
    Date: {email.ts}
    Body:
    {email.body_text[:2000]}  # Truncate body to avoid token limits if necessary
    """
    
    try:
        response = chat_completion(
            system_prompt=system_prompt,
            user_prompt=email_content,
            response_format={"type": "json_object"}
        )
        
        content = response.get("content")
        if not content:
            raise ValueError("Empty response from LLM")
            
        return json.loads(content)
    except Exception as e:
        logger.error(f"Error analyzing email {email.id}: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Process emails for dashboard.")
    parser.add_argument("--verbose", action="store_true", help="Show progress logs")
    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.INFO)

    raw_session = RawSession()
    dashboard_session = DashboardSession()
    
    try:
        # 1. Get all processed original_ids to avoid reprocessing
        processed_ids = {id_ for (id_,) in dashboard_session.query(ProcessedEmail.original_id).all()}
        
        # 2. Fetch unprocessed emails from raw DB
        # We fetch in batches if needed, but for now let's fetch all unprocessed
        if processed_ids:
            unprocessed_emails = raw_session.query(RawEmail).filter(RawEmail.id.notin_(processed_ids)).all()
        else:
            unprocessed_emails = raw_session.query(RawEmail).all()
        
        logger.info(f"Found {len(unprocessed_emails)} unprocessed emails.")
        
        for email in unprocessed_emails:
            logger.info(f"Processing email ID: {email.id} - {email.subject[:30]}...")
            
            # Analyze with LLM
            analysis = analyze_email(email)
            
            if not analysis:
                logger.warning(f"Skipping email ID {email.id} due to analysis failure.")
                continue

            # Create ProcessedEmail record
            processed_email = ProcessedEmail(
                original_id=email.id,
                user_id=email.user_id,
                subject=email.subject,
                sender=email.sender,
                received_at=email.ts,
                body_text=email.body_text,
                main_type_key=analysis.get("main_type_key", "personal"),
                sub_type_key=analysis.get("sub_type_key", "personal"),
                quadrant=analysis.get("quadrant", "not_urgent_not_important"),
                quadrant_reason=analysis.get("quadrant_reason", ""),
                summary=analysis.get("summary", ""),
                keywords=analysis.get("keywords", []),
                need_action=analysis.get("need_action", False),
            )
            
            dashboard_session.add(processed_email)
            # Commit frequently or in batches. Here we commit per email to save progress.
            try:
                dashboard_session.commit()
                logger.info(f"Successfully processed and saved email ID: {email.id}")
            except Exception as e:
                dashboard_session.rollback()
                logger.error(f"Failed to save email ID {email.id}: {e}")
                
    except Exception as e:
        logger.error(f"An error occurred during the process: {e}")
    finally:
        raw_session.close()
        dashboard_session.close()

if __name__ == "__main__":
    main()
