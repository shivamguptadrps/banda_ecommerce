#!/bin/bash

# Start All Services Script
# Starts Backend, React Native (Expo), and React Web App together

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

# Log files
BACKEND_LOG="/tmp/banda_backend.log"
MOBILE_LOG="/tmp/banda_mobile.log"
FRONTEND_LOG="/tmp/banda_frontend.log"

# PID files
BACKEND_PID="/tmp/banda_backend.pid"
MOBILE_PID="/tmp/banda_mobile.pid"
FRONTEND_PID="/tmp/banda_frontend.pid"

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down all services...${NC}"
    
    # Kill backend
    if [ -f "$BACKEND_PID" ]; then
        BACKEND_PID_VALUE=$(cat "$BACKEND_PID")
        if ps -p "$BACKEND_PID_VALUE" > /dev/null 2>&1; then
            kill "$BACKEND_PID_VALUE" 2>/dev/null
            echo -e "${GREEN}✅ Backend stopped${NC}"
        fi
        rm -f "$BACKEND_PID"
    fi
    
    # Kill mobile (Expo)
    if [ -f "$MOBILE_PID" ]; then
        MOBILE_PID_VALUE=$(cat "$MOBILE_PID")
        if ps -p "$MOBILE_PID_VALUE" > /dev/null 2>&1; then
            kill "$MOBILE_PID_VALUE" 2>/dev/null
            echo -e "${GREEN}✅ React Native (Expo) stopped${NC}"
        fi
        rm -f "$MOBILE_PID"
    fi
    
    # Kill frontend
    if [ -f "$FRONTEND_PID" ]; then
        FRONTEND_PID_VALUE=$(cat "$FRONTEND_PID")
        if ps -p "$FRONTEND_PID_VALUE" > /dev/null 2>&1; then
            kill "$FRONTEND_PID_VALUE" 2>/dev/null
            echo -e "${GREEN}✅ React Web App stopped${NC}"
        fi
        rm -f "$FRONTEND_PID"
    fi
    
    # Kill any remaining processes on ports
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    lsof -ti:8081 | xargs kill -9 2>/dev/null
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up trap for cleanup on exit
trap cleanup SIGINT SIGTERM EXIT

# Clear old logs
> "$BACKEND_LOG"
> "$MOBILE_LOG"
> "$FRONTEND_LOG"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🚀 Starting Banda E-Commerce Development Servers     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    echo -e "${RED}❌ Could not detect local IP address${NC}"
    LOCAL_IP="localhost"
else
    echo -e "${GREEN}✅ Detected local IP: $LOCAL_IP${NC}"
    
    # Update mobile .env file with the correct API URL
    MOBILE_ENV="$PROJECT_ROOT/mobile/.env"
    if [ -f "$MOBILE_ENV" ]; then
        # Update or add EXPO_PUBLIC_API_URL
        if grep -q "EXPO_PUBLIC_API_URL" "$MOBILE_ENV"; then
            sed -i.bak "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$LOCAL_IP:8000/api/v1|" "$MOBILE_ENV"
        else
            echo "EXPO_PUBLIC_API_URL=http://$LOCAL_IP:8000/api/v1" >> "$MOBILE_ENV"
        fi
        echo -e "${GREEN}✅ Updated mobile/.env with API URL: http://$LOCAL_IP:8000/api/v1${NC}"
    else
        # Create .env file if it doesn't exist
        echo "EXPO_PUBLIC_API_URL=http://$LOCAL_IP:8000/api/v1" > "$MOBILE_ENV"
        echo -e "${GREEN}✅ Created mobile/.env with API URL: http://$LOCAL_IP:8000/api/v1${NC}"
    fi
fi

echo ""

# ============== Start Backend ==============
echo -e "${BLUE}📦 Starting Backend Server...${NC}"

if [ ! -d "$PROJECT_ROOT/backend/venv" ]; then
    echo -e "${RED}❌ Backend virtual environment not found${NC}"
    echo -e "${YELLOW}   Please create it with: cd backend && python3 -m venv venv${NC}"
    exit 1
fi

cd "$PROJECT_ROOT/backend"
"$PROJECT_ROOT/backend/venv/bin/python3" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > "$BACKEND_LOG" 2>&1 &
BACKEND_PID_VALUE=$!
echo "$BACKEND_PID_VALUE" > "$BACKEND_PID"

sleep 3
if ps -p "$BACKEND_PID_VALUE" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID_VALUE)${NC}"
    echo -e "   ${CYAN}🌐 API: http://$LOCAL_IP:8000${NC}"
    echo -e "   ${CYAN}📚 Docs: http://$LOCAL_IP:8000/docs${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo -e "${YELLOW}   Check logs: tail -f $BACKEND_LOG${NC}"
    exit 1
fi

echo ""

# ============== Start React Native (Expo) ==============
echo -e "${BLUE}📱 Starting React Native (Expo)...${NC}"

if [ ! -d "$PROJECT_ROOT/mobile/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Mobile node_modules not found. Installing dependencies...${NC}"
    cd "$PROJECT_ROOT/mobile"
    npm install
fi

cd "$PROJECT_ROOT/mobile"
npm start > "$MOBILE_LOG" 2>&1 &
MOBILE_PID_VALUE=$!
echo "$MOBILE_PID_VALUE" > "$MOBILE_PID"

sleep 5
if ps -p "$MOBILE_PID_VALUE" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ React Native (Expo) started (PID: $MOBILE_PID_VALUE)${NC}"
    echo -e "   ${CYAN}📱 Metro: http://localhost:8081${NC}"
    echo -e "   ${CYAN}📱 Scan QR code in Expo Go app${NC}"
else
    echo -e "${YELLOW}⚠️  React Native may still be starting...${NC}"
    echo -e "   ${CYAN}📱 Check logs: tail -f $MOBILE_LOG${NC}"
fi

echo ""

# ============== Start React Web App ==============
echo -e "${BLUE}🌐 Starting React Web App (Next.js)...${NC}"

if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Frontend node_modules not found. Installing dependencies...${NC}"
    cd "$PROJECT_ROOT/frontend"
    npm install
fi

cd "$PROJECT_ROOT/frontend"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID_VALUE=$!
echo "$FRONTEND_PID_VALUE" > "$FRONTEND_PID"

sleep 5
if ps -p "$FRONTEND_PID_VALUE" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ React Web App started (PID: $FRONTEND_PID_VALUE)${NC}"
    echo -e "   ${CYAN}🌐 Web: http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️  React Web App may still be starting...${NC}"
    echo -e "   ${CYAN}🌐 Check logs: tail -f $FRONTEND_LOG${NC}"
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              ✅ All Services Started Successfully!        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📊 Service Status:${NC}"
echo -e "   ${CYAN}Backend:${NC}     http://$LOCAL_IP:8000"
echo -e "   ${CYAN}API Docs:${NC}    http://$LOCAL_IP:8000/docs"
echo -e "   ${CYAN}Web App:${NC}     http://localhost:3000"
echo -e "   ${CYAN}Mobile:${NC}      http://localhost:8081 (Scan QR in Expo Go)"
echo ""
echo -e "${YELLOW}📝 Log Files:${NC}"
echo -e "   Backend:  tail -f $BACKEND_LOG"
echo -e "   Mobile:   tail -f $MOBILE_LOG"
echo -e "   Frontend: tail -f $FRONTEND_LOG"
echo ""
echo -e "${YELLOW}💡 Tip: Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all background processes
wait

