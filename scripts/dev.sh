#!/bin/bash

# ==============================================
# Banda E-Commerce Development Startup Script
# ==============================================
# This script starts backend, frontend, and mobile app
# Usage: ./scripts/dev.sh [backend|frontend|mobile|both|all]
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ==============================================
# Helper Functions
# ==============================================

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  🛒 Banda E-Commerce Development${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Load NVM
load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        \. "$NVM_DIR/nvm.sh"
        print_success "NVM loaded"
    else
        # Fallback: add node directly to PATH
        if [ -d "$HOME/.nvm/versions/node/v18.20.8/bin" ]; then
            export PATH="$HOME/.nvm/versions/node/v18.20.8/bin:$PATH"
            print_warning "NVM script not found, using direct path"
        else
            print_error "Node.js not found! Please install Node.js via nvm"
            exit 1
        fi
    fi
}

# Check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Kill process on port
kill_port() {
    local port=$1
    if check_port $port; then
        print_warning "Killing process on port $port"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Ensure Node.js is available
ensure_node() {
    if ! command -v node &> /dev/null; then
        load_nvm
        if ! command -v node &> /dev/null; then
            print_error "Node.js not found! Please install Node.js"
            exit 1
        fi
    fi
}

# ==============================================
# Backend Functions
# ==============================================

start_backend() {
    print_info "Starting Backend (FastAPI)..."
    
    cd "$PROJECT_ROOT/backend"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_warning "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies if needed
    if [ ! -f "venv/.deps_installed" ]; then
        print_info "Installing Python dependencies..."
        pip install -r requirements.txt --quiet
        touch venv/.deps_installed
    fi
    
    # Kill existing process on port 8000
    kill_port 8000
    
    # Start the backend server
    print_success "Backend starting on http://localhost:8000"
    print_info "API Docs: http://localhost:8000/docs"
    
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$PROJECT_ROOT/.backend.pid"
}

# ==============================================
# Frontend Functions
# ==============================================

start_frontend() {
    print_info "Starting Frontend (Next.js)..."
    
    # Ensure Node.js is available
    ensure_node
    
    cd "$PROJECT_ROOT/frontend"
    
    # Check Node version
    NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
    print_info "Node.js version: $NODE_VERSION"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing Node dependencies..."
        npm install
    fi
    
    # Create .env.local if not exists
    if [ ! -f ".env.local" ]; then
        echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
        print_success "Created .env.local"
    fi
    
    # Kill existing process on port 3000
    kill_port 3000
    
    # Start the frontend server
    print_success "Frontend starting on http://localhost:3000"
    
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$PROJECT_ROOT/.frontend.pid"
}

# ==============================================
# Mobile Functions
# ==============================================

start_mobile() {
    print_info "Starting Mobile App (React Native/Expo)..."
    
    # Ensure Node.js is available
    ensure_node
    
    cd "$PROJECT_ROOT/mobile"
    
    # Check Node version
    NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
    print_info "Node.js version: $NODE_VERSION"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing Node dependencies..."
        npm install
    fi
    
    # Always update .env with current network IP for mobile device access
    # Get local IP for API URL
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP="localhost"
        print_warning "Could not detect network IP, using localhost"
        print_warning "Mobile devices on same network won't be able to connect"
    else
        print_success "Detected network IP: $LOCAL_IP"
    fi
    
    # Update .env with network IP (always update to ensure correct IP)
    echo "EXPO_PUBLIC_API_URL=http://$LOCAL_IP:8000/api/v1" > .env
    print_success "Updated .env with API URL: http://$LOCAL_IP:8000/api/v1"
    
    # Kill existing process on port 8081 (Metro bundler)
    kill_port 8081
    
    # Start the mobile app with network access
    print_success "Mobile app starting (Expo Metro bundler)"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📱 MOBILE APP ACCESS INFORMATION${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🌐 Network IP Address:${NC} ${GREEN}$LOCAL_IP${NC}"
    echo -e "${BLUE}📡 Metro Bundler:${NC}     ${GREEN}http://$LOCAL_IP:8081${NC}"
    echo -e "${BLUE}🔌 API Endpoint:${NC}     ${GREEN}http://$LOCAL_IP:8000/api/v1${NC}"
    echo -e "${BLUE}📲 Scan QR Code:${NC}     Use Expo Go app to scan QR code"
    echo -e "${BLUE}⌨️  Keyboard Shortcuts:${NC}"
    echo -e "   ${YELLOW}Press 'i'${NC} for iOS Simulator"
    echo -e "   ${YELLOW}Press 'a'${NC} for Android Emulator"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    print_info "Make sure your mobile device is on the same Wi-Fi network"
    print_info "For network access issues, use: expo start --tunnel"
    echo ""
    
    # Start Expo with LAN access enabled
    EXPO_NO_DOTENV=1 npx expo start --lan &
    MOBILE_PID=$!
    echo $MOBILE_PID > "$PROJECT_ROOT/.mobile.pid"
}

# ==============================================
# Stop Functions
# ==============================================

stop_servers() {
    print_info "Stopping servers..."
    
    # Stop backend
    if [ -f "$PROJECT_ROOT/.backend.pid" ]; then
        kill $(cat "$PROJECT_ROOT/.backend.pid") 2>/dev/null || true
        rm "$PROJECT_ROOT/.backend.pid"
    fi
    kill_port 8000
    
    # Stop frontend
    if [ -f "$PROJECT_ROOT/.frontend.pid" ]; then
        kill $(cat "$PROJECT_ROOT/.frontend.pid") 2>/dev/null || true
        rm "$PROJECT_ROOT/.frontend.pid"
    fi
    kill_port 3000
    
    # Stop mobile
    if [ -f "$PROJECT_ROOT/.mobile.pid" ]; then
        kill $(cat "$PROJECT_ROOT/.mobile.pid") 2>/dev/null || true
        rm "$PROJECT_ROOT/.mobile.pid"
    fi
    kill_port 8081
    
    print_success "All servers stopped"
}

# ==============================================
# Main Script
# ==============================================

print_header

# Handle command line arguments
case "${1:-both}" in
    backend)
        start_backend
        print_success "Backend is running!"
        wait
        ;;
    frontend)
        start_frontend
        print_success "Frontend is running!"
        wait
        ;;
    mobile)
        start_mobile
        print_success "Mobile app is running!"
        wait
        ;;
    both)
        start_backend
        sleep 2
        start_frontend
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  🚀 Both servers are running!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        echo -e "  Frontend: ${BLUE}http://localhost:3000${NC}"
        echo -e "  Backend:  ${BLUE}http://localhost:8000${NC}"
        echo -e "  API Docs: ${BLUE}http://localhost:8000/docs${NC}"
        echo ""
        echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
        echo ""
        
        # Trap Ctrl+C to stop both servers
        trap stop_servers EXIT
        wait
        ;;
    all)
        start_backend
        sleep 2
        start_frontend
        sleep 2
        start_mobile
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  🚀 All services are running!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        # Get IP for mobile display
        MOBILE_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
        if [ -z "$MOBILE_IP" ]; then
            MOBILE_IP="localhost"
        fi
        
        echo -e "  Frontend: ${BLUE}http://localhost:3000${NC}"
        echo -e "  Backend:  ${BLUE}http://localhost:8000${NC}"
        echo -e "  API Docs: ${BLUE}http://localhost:8000/docs${NC}"
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}📱 MOBILE APP ACCESS${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "  ${BLUE}Network IP:${NC}     ${GREEN}$MOBILE_IP${NC}"
        echo -e "  ${BLUE}Metro Bundler:${NC}  ${GREEN}http://$MOBILE_IP:8081${NC}"
        echo -e "  ${BLUE}API Endpoint:${NC}   ${GREEN}http://$MOBILE_IP:8000/api/v1${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
        echo ""
        
        # Trap Ctrl+C to stop all servers
        trap stop_servers EXIT
        wait
        ;;
    stop)
        stop_servers
        ;;
    *)
        echo "Usage: $0 [backend|frontend|mobile|both|all|stop]"
        echo ""
        echo "Commands:"
        echo "  backend   - Start only the backend server"
        echo "  frontend  - Start only the frontend server"
        echo "  mobile    - Start only the mobile app (Expo)"
        echo "  both      - Start backend + frontend (default)"
        echo "  all       - Start backend + frontend + mobile"
        echo "  stop      - Stop all running servers"
        exit 1
        ;;
esac

