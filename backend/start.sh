#!/bin/sh
# Railway startup script for FastAPI
# Properly handles PORT environment variable

PORT=${PORT:-8000}
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
