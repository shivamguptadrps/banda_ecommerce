#!/bin/bash

# Script to update API URL in mobile app
# Automatically detects your local IP and updates .env file

echo "🔍 Detecting local IP address..."

# Get local IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not detect local IP address"
    echo "Please find your IP manually:"
    echo "  macOS/Linux: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
    echo "  Windows: ipconfig"
    exit 1
fi

echo "✅ Detected IP: $LOCAL_IP"
echo ""

# Create .env file
ENV_FILE="mobile/.env"
API_URL="http://${LOCAL_IP}:8000/api/v1"

echo "📝 Creating/updating $ENV_FILE..."
echo "EXPO_PUBLIC_API_URL=${API_URL}" > "$ENV_FILE"

echo "✅ Updated API URL to: $API_URL"
echo ""
echo "📱 Next steps:"
echo "1. Make sure backend is running: cd backend && ./start_network.sh"
echo "2. Restart Expo with cleared cache: cd mobile && expo start -c"
echo "3. Connect your mobile device on the same Wi-Fi network"
echo ""

