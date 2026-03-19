FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./

# Install pip dependencies from pyproject.toml
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    fastapi>=0.110.0 \
    uvicorn>=0.23.0 \
    feedparser>=6.0.12 \
    html-to-markdown>=2.7.1 \
    markdown>=3.7.0 \
    openai>=2.7.2 \
    psycopg2-binary>=2.9.11 \
    pydantic>=2.0.0 \
    python-dotenv>=1.2.1 \
    requests>=2.32.5 \
    sqlalchemy>=2.0.44 \
    youtube-transcript-api>=1.2.3 \
    apscheduler>=3.10.4 \
    pytz>=2024.1

COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8000"]
