#!/bin/bash

# Start Mobile App Script
# This script starts the Expo development server for the mobile app

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  📱 Starting Banda Mobile App${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Load NVM
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    nvm use 18.20.8 2>/dev/null || nvm use default 2>/dev/null || true
    echo -e "${GREEN}✅ NVM loaded${NC}"
elif [ -d "$HOME/.nvm/versions/node/v18.20.8/bin" ]; then
    export PATH="$HOME/.nvm/versions/node/v18.20.8/bin:$PATH"
    echo -e "${YELLOW}⚠️  Using direct Node path${NC}"
else
    # Try to find any node version
    NODE_PATH=$(find "$HOME/.nvm/versions/node" -name "node" -type f 2>/dev/null | head -1)
    if [ -n "$NODE_PATH" ]; then
        export PATH="$(dirname "$NODE_PATH"):$PATH"
        echo -e "${YELLOW}⚠️  Using found Node path: $NODE_PATH${NC}"
    else
        echo -e "${YELLOW}❌ Node.js not found! Please install Node.js${NC}"
        exit 1
    fi
fi

# Check Node version
echo -e "${BLUE}ℹ️  Node.js version: $(node --version)${NC}"

# Navigate to mobile directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing dependencies...${NC}"
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    echo "EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env
fi

echo ""
echo -e "${GREEN}✅ Starting Expo development server...${NC}"
echo ""

# Start Expo
npm start

