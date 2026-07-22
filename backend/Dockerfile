FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
COPY scripts ./scripts
COPY sql ./sql
COPY .env.example ./.env.example

EXPOSE 8000

# Create tables on start (safe IF NOT EXISTS via SQLAlchemy), then run API
CMD ["sh", "-c", "python -c \"from app.db.session import engine, Base; from app.db import models, models_extra, registry; Base.metadata.create_all(bind=engine)\" && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
