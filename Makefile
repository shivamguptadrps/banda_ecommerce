# ==============================================
# Banda E-Commerce Makefile
# ==============================================
# Quick commands for development
# Usage: make <command>
# ==============================================

.PHONY: help dev backend frontend stop install test clean admin

# Default target
help:
	@echo ""
	@echo "🛒 Banda E-Commerce - Development Commands"
	@echo "==========================================="
	@echo ""
	@echo "  make dev        - Start both backend and frontend"
	@echo "  make backend    - Start only backend server"
	@echo "  make frontend   - Start only frontend server"
	@echo "  make stop       - Stop all running servers"
	@echo "  make install    - Install all dependencies"
	@echo "  make test       - Run backend tests"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make migrate    - Run database migrations"
	@echo "  make admin      - Create default admin user"
	@echo ""
	@echo "Admin Credentials (default):"
	@echo "  Email:    admin@banda.com"
	@echo "  Password: Admin@123"
	@echo ""

# Start both servers
dev:
	@./scripts/dev.sh both

# Start backend only
backend:
	@./scripts/dev.sh backend

# Start frontend only  
frontend:
	@./scripts/dev.sh frontend

# Stop all servers
stop:
	@./scripts/dev.sh stop

# Install all dependencies
install:
	@echo "📦 Installing backend dependencies..."
	@cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
	@echo "📦 Installing frontend dependencies..."
	@export PATH="$$HOME/.nvm/versions/node/v18.20.8/bin:$$PATH" && cd frontend && npm install
	@echo "✅ All dependencies installed!"

# Run tests
test:
	@echo "🧪 Running backend tests..."
	@cd backend && source venv/bin/activate && python -m pytest tests/ -v

# Clean build artifacts
clean:
	@echo "🧹 Cleaning..."
	@rm -rf backend/__pycache__ backend/**/__pycache__
	@rm -rf frontend/.next frontend/node_modules/.cache
	@rm -f .backend.pid .frontend.pid
	@echo "✅ Cleaned!"

# Database migrations
migrate:
	@echo "🗄️ Running database migrations..."
	@cd backend && source venv/bin/activate && alembic upgrade head

# Create new migration
migration:
	@echo "📝 Creating new migration..."
	@cd backend && source venv/bin/activate && alembic revision --autogenerate -m "$(msg)"

# Create admin user
admin:
	@echo "🔐 Creating admin user..."
	@cd backend && source venv/bin/activate && python scripts/create_admin.py

# Create admin with custom credentials
admin-custom:
	@echo "🔐 Creating admin user with custom credentials..."
	@cd backend && source venv/bin/activate && python scripts/create_admin.py --email $(email) --password $(password) --name "$(name)"

