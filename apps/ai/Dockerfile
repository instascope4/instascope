# Build context: apps/ai
FROM python:3.11-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock README.md ./
COPY src/ ./src/
RUN uv sync --frozen --no-cache --no-dev

FROM python:3.11-slim
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser \
 && apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
# HuggingFace model cache (volume ile kalıcı)
ENV PATH="/app/.venv/bin:$PATH" HF_HOME=/app/.cache/huggingface PYTHONUNBUFFERED=1
RUN mkdir -p /app/.cache/huggingface && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "ai.main:app", "--host", "0.0.0.0", "--port", "8000"]
