import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load the project .env explicitly so local and docker runs both get the same config.
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)


def get_environment() -> str:
    return os.getenv("ENVIRONMENT", "LOCAL").upper()


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL", "")
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        return database_url

    # Auto-fallback: build from individual env vars if set, else use SQLite
    user = os.getenv("POSTGRES_USER", "")
    password = os.getenv("POSTGRES_PASSWORD", "")
    host = os.getenv("POSTGRES_HOST", "")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "ai_news_aggregator")

    if user and password and host:
        return f"postgresql://{user}:{password}@{host}:{port}/{db}"

    # Final fallback: local SQLite
    return "sqlite:///./local_news.db"


def get_database_info() -> dict:
    url = get_database_url()
    env = get_environment()

    if (
        "render.com" in url.lower()
        or "amazonaws.com" in url.lower()
        or env == "PRODUCTION"
    ):
        env_type = "PRODUCTION"
    else:
        env_type = "LOCAL"

    masked_url = url
    if "@" in url:
        parts = url.split("@")
        if len(parts) == 2:
            masked_url = f"{parts[0].split('://')[0]}://***@{parts[1]}"

    return {
        "environment": env_type,
        "url_masked": masked_url,
        "host": url.split("@")[-1].split("/")[0] if "@" in url else "local-sqlite",
    }


def _create_engine():
    url = get_database_url()
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url)


engine = _create_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_session():
    return SessionLocal()
