#!/bin/bash

# Start Backend Server for Network Access
# This allows mobile devices on the same network to connect

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Activated virtual environment"
else
    echo "❌ Virtual environment not found at venv/"
    echo "Please create it with: python3 -m venv venv"
    exit 1
fi

echo "🚀 Starting Backend Server for Network Access..."
echo "📱 Make sure your mobile device is on the same Wi-Fi network"
echo ""

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not detect local IP address"
    echo "Please find your IP manually and update mobile/.env"
    exit 1
fi

echo "✅ Detected local IP: $LOCAL_IP"
echo "📝 Update mobile/.env with: EXPO_PUBLIC_API_URL=http://$LOCAL_IP:8000/api/v1"
echo ""
echo "🌐 Backend will be accessible at: http://$LOCAL_IP:8000"
echo "📚 API Docs: http://$LOCAL_IP:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start uvicorn server using the virtual environment's Python directly
"$SCRIPT_DIR/venv/bin/python3" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

