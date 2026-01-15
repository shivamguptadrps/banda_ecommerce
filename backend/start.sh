#!/bin/sh
# Railway startup script for FastAPI
# Properly handles PORT environment variable

# Get PORT from environment, default to 8000 if not set
PORT=${PORT:-8000}

# Log the port being used
echo "Starting FastAPI on port: $PORT"

# Start uvicorn with the correct port
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
