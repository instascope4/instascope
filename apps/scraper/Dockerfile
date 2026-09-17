# Build context: apps/scraper
FROM python:3.12-slim
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser \
 && apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml ./
COPY src/ ./src/
RUN pip install --no-cache-dir . && mkdir -p /app/logs /data && chown -R appuser:appuser /app /data
ENV PYTHONUNBUFFERED=1 INSTAGRAM_SESSION_FILE=/data/instaloader-session LOG_FILE=/app/logs/scraper.log
USER appuser
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD curl -f http://localhost:8001/health || exit 1
CMD ["uvicorn", "scraper.service:app", "--host", "0.0.0.0", "--port", "8001"]
