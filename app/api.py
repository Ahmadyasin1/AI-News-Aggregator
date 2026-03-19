from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import logging

from sqlalchemy import text
from app.database.repository import Repository
from app.database.connection import get_database_info, get_database_url
from app.daily_runner import run_daily_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


class ArticleResponse(BaseModel):
    id: str
    title: str
    url: str
    article_type: str
    summary: Optional[str] = None
    created_at: Optional[str] = None
    sent_at: Optional[str] = None


class PipelineResponse(BaseModel):
    start_time: str
    end_time: str
    duration_seconds: float
    success: bool
    scraping: dict
    processing: dict
    digests: dict
    email: dict
    error: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the 8 AM daily email scheduler when the server starts."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
        import pytz

        timezone_name = os.getenv("SCHEDULER_TIMEZONE", "Asia/Karachi")
        try:
            tz = pytz.timezone(timezone_name)
        except Exception:
            tz = pytz.utc

        scheduler = BackgroundScheduler(timezone=tz)
        scheduler.add_job(
            _run_pipeline_job,
            CronTrigger(hour=8, minute=0, timezone=tz),
            id="daily_digest_8am",
            replace_existing=True,
            misfire_grace_time=3600,  # allow up to 1hr late fire if server was down
        )
        scheduler.start()
        app.state.scheduler = scheduler
        logger.info(f"✅ Daily 8:00 AM digest scheduler started (timezone: {timezone_name})")
    except Exception as e:
        logger.error(f"⚠️  Scheduler failed to start: {e}")

    yield  # Server runs here

    # Graceful shutdown
    if hasattr(app.state, "scheduler") and app.state.scheduler.running:
        app.state.scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped cleanly")


def _run_pipeline_job():
    """Wrapper for the scheduler to run the daily pipeline safely."""
    try:
        logger.info("⏰ 8:00 AM — Running scheduled daily digest pipeline...")
        result = run_daily_pipeline(hours=24, top_n=10)
        status = "Sent ✉️" if result.get("email", {}).get("success") else "Skipped/Error"
        logger.info(f"⏰ Scheduled pipeline complete. Email: {status}")
    except Exception as e:
        logger.error(f"⚠️  Scheduled pipeline failed: {e}", exc_info=True)


app = FastAPI(
    title="AI News Aggregator API",
    description=(
        "**Ahmad Yasin · Founder @Nexariza Ai**\n\n"
        "AI-powered news aggregation pipeline using Meta Llama 3 via HuggingFace. "
        "Scrapes YouTube, OpenAI, and Anthropic sources, summarizes with LLM, "
        "ranks top 10, and sends a daily email digest at 8:00 AM automatically."
    ),
    version="2.0.0",
    contact={"name": "Ahmad Yasin", "email": "mianahmadyasin786@gmail.com"},
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
def root():
    return {
        "message": "AI News Aggregator API is running! 🚀",
        "author": "Ahmad Yasin · Founder @Nexariza Ai",
        "docs_url": "/docs",
        "frontend": "Please visit your frontend Static Site URL to view the dashboard."
    }

@app.get("/api/health", tags=["System"])
def health_check():
    scheduler_running = False
    next_run = None
    if hasattr(app.state, "scheduler"):
        scheduler_running = app.state.scheduler.running
        job = app.state.scheduler.get_job("daily_digest_8am")
        if job and job.next_run_time:
            next_run = job.next_run_time.isoformat()

    return {
        "status": "ok",
        "author": "Ahmad Yasin · Founder @Nexariza Ai",
        "model": os.getenv("HF_MODEL", "meta-llama/Llama-3.2-3B-Instruct"),
        "scheduler": {
            "running": scheduler_running,
            "next_run_8am": next_run,
            "timezone": os.getenv("SCHEDULER_TIMEZONE", "Asia/Karachi"),
        },
        "database": get_database_info(),
    }


# ─── Stats ────────────────────────────────────────────────────────────────────

@app.get("/api/stats", tags=["Analytics"])
def get_stats():
    repo = Repository()
    try:
        youtube_count = repo.session.execute(text("SELECT COUNT(*) FROM youtube_videos")).scalar()
        openai_count = repo.session.execute(text("SELECT COUNT(*) FROM openai_articles")).scalar()
        anthropic_count = repo.session.execute(text("SELECT COUNT(*) FROM anthropic_articles")).scalar()
        digest_count = repo.session.execute(text("SELECT COUNT(*) FROM digests")).scalar()
        sent_count = repo.session.execute(
            text("SELECT COUNT(*) FROM digests WHERE sent_at IS NOT NULL")
        ).scalar()
    finally:
        repo.session.close()

    return {
        "database": get_database_info(),
        "counts": {
            "youtube_videos": youtube_count,
            "openai_articles": openai_count,
            "anthropic_articles": anthropic_count,
            "digests": digest_count,
            "digests_sent": sent_count,
        },
    }


# ─── Articles ─────────────────────────────────────────────────────────────────

@app.get("/api/articles", response_model=List[ArticleResponse], tags=["Content"])
def list_articles(source: Optional[str] = None, limit: int = 50):
    repo = Repository()
    items = []
    try:
        if source is None or source.lower() == "youtube":
            records = repo.session.execute(
                text("SELECT video_id, title, url FROM youtube_videos ORDER BY published_at DESC LIMIT :limit"),
                {"limit": limit},
            ).fetchall()
            items.extend([{"id": r[0], "title": r[1], "url": r[2], "article_type": "youtube"} for r in records])

        if source is None or source.lower() == "openai":
            records = repo.session.execute(
                text("SELECT guid, title, url FROM openai_articles ORDER BY published_at DESC LIMIT :limit"),
                {"limit": limit},
            ).fetchall()
            items.extend([{"id": r[0], "title": r[1], "url": r[2], "article_type": "openai"} for r in records])

        if source is None or source.lower() == "anthropic":
            records = repo.session.execute(
                text("SELECT guid, title, url FROM anthropic_articles ORDER BY published_at DESC LIMIT :limit"),
                {"limit": limit},
            ).fetchall()
            items.extend([{"id": r[0], "title": r[1], "url": r[2], "article_type": "anthropic"} for r in records])
    finally:
        repo.session.close()

    return items[:limit]


# ─── Digests ──────────────────────────────────────────────────────────────────

@app.get("/api/digests", response_model=List[ArticleResponse], tags=["Content"])
def get_digests(limit: int = 50, include_sent: bool = False):
    repo = Repository()
    try:
        base_query = "SELECT id, article_type, title, url, summary, created_at, sent_at FROM digests"
        if not include_sent:
            base_query += " WHERE sent_at IS NULL"
        base_query += " ORDER BY created_at DESC LIMIT :limit"
        rows = repo.session.execute(text(base_query), {"limit": limit}).fetchall()
    finally:
        repo.session.close()

    return [
        {
            "id": row[0],
            "article_type": row[1],
            "title": row[2],
            "url": row[3],
            "summary": row[4],
            "created_at": str(row[5]) if row[5] else None,
            "sent_at": str(row[6]) if row[6] else None,
        }
        for row in rows
    ]


# ─── Pipeline Trigger ─────────────────────────────────────────────────────────

@app.post("/api/run-pipeline", response_model=PipelineResponse, tags=["Pipeline"])
def run_pipeline(hours: int = 24, top_n: int = 10):
    """Manually trigger the full pipeline: scrape → summarize → rank → email."""
    result = run_daily_pipeline(hours=hours, top_n=top_n)
    if not result.get("success", False):
        raise HTTPException(status_code=500, detail=result.get("error", "Pipeline failed"))
    return result
