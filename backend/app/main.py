"""
FastAPI Application Entry Point
Main application configuration and startup
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys

from app.config import settings
from app.api.v1.router import api_router
from app.utils.tasks import task_runner
from app.database import check_database_connection

# Configure logging to both console and file
import os
from pathlib import Path

# Create logs directory if it doesn't exist
log_dir = Path(__file__).parent.parent / "logs"
log_dir.mkdir(exist_ok=True)

# Log file path
log_file = log_dir / "backend.log"

# Configure logging with both file and console handlers
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),  # Console output
        logging.FileHandler(log_file, mode='a', encoding='utf-8')  # File output
    ]
)
logger = logging.getLogger(__name__)

# Log the log file location
logger.info(f"Logging to file: {log_file.absolute()}")
print(f"[LOG] Backend logs are being written to: {log_file.absolute()}")


# ============== Lifespan Events ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events.
    Runs on startup and shutdown.
    """
    # Startup
    print(f"[STARTING] {settings.app_name} v{settings.app_version}")
    print(f"[INFO] API Docs: http://localhost:8000/docs")
    
    # Check database connection
    print("[INFO] Checking database connection...")
    check_database_connection()
    
    # Start background tasks (always, for order auto-cancellation)
    await task_runner.start()
    
    yield
    
    # Shutdown
    await task_runner.stop()
    
    print("[SHUTDOWN] Shutting down...")


# ============== Application Factory ==============

def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Returns:
        Configured FastAPI instance
    """
    app = FastAPI(
        title=settings.app_name,
        description="""
        ## Banda E-Commerce API
        
        A city-level e-commerce marketplace where local vendors can register 
        their products and city residents can purchase them.
        
        ### Features
        - 🔐 JWT Authentication with role-based access
        - 🏪 Vendor registration and management
        - 📦 Product catalog with flexible pricing
        - 🛒 Shopping cart and order management
        - 💳 Razorpay payment integration
        - 📍 Location-based delivery
        
        ### Roles
        - **BUYER**: Browse products, place orders
        - **VENDOR**: Manage shop, products, and orders
        - **ADMIN**: Platform management
        """,
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )
    
    # ============== CORS Middleware ==============
    # Allow all origins in development for easier testing
    # In production, use specific origins from settings
    allow_all_origins = settings.debug or "*" in settings.cors_origins
    
    # Build CORS origins list - be explicit for development
    if allow_all_origins:
        # In development, allow all origins explicitly
        cors_origins = ["*"]
        allow_credentials = False  # Can't use credentials with wildcard "*"
    else:
        # In production, use specific origins
        cors_origins = settings.cors_origins
        allow_credentials = True
    
    logger.info("=" * 60)
    logger.info("CORS Configuration:")
    logger.info(f"  - Debug mode: {settings.debug}")
    logger.info(f"  - Allow all origins: {allow_all_origins}")
    logger.info(f"  - Origins: {cors_origins}")
    logger.info(f"  - Allow credentials: {allow_credentials}")
    logger.info("=" * 60)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=allow_credentials,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
        allow_headers=["*"],  # Allow all headers for maximum compatibility
        expose_headers=["*"],
        max_age=3600,  # Cache preflight requests for 1 hour
    )
    
    # Add request logging middleware to debug CORS issues
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """Log all incoming requests for debugging CORS issues."""
        origin = request.headers.get("origin", "No Origin")
        method = request.method
        path = request.url.path
        headers = dict(request.headers)
        
        # Only log API requests to reduce noise
        if path.startswith("/api/"):
            logger.info(f"[REQUEST] {method} {path}")
            logger.info(f"  Origin: {origin}")
            
            if method == "OPTIONS":
                logger.info(f"  [CORS PREFLIGHT] {path}")
            elif method in ["POST", "PUT", "PATCH"]:
                # Try to log request body (for debugging)
                try:
                    body = await request.body()
                    if body:
                        body_str = body.decode('utf-8')[:500]  # Limit to 500 chars
                        logger.info(f"  Request body: {body_str}")
                except:
                    pass
        
        response = await call_next(request)
        
        # Log CORS headers in response for API requests
        if path.startswith("/api/"):
            cors_headers = {
                k: v for k, v in response.headers.items() 
                if k.lower().startswith("access-control")
            }
            if cors_headers:
                logger.info(f"  [CORS Response Headers]: {cors_headers}")
            
            logger.info(f"  [RESPONSE] {response.status_code}")
        
        return response
    
    # ============== Exception Handlers ==============
    
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        logger.error(f"[ValueError] {request.method} {request.url.path}: {exc}")
        return JSONResponse(
            status_code=400,
            content={"detail": str(exc)},
        )
    
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Catch all unhandled exceptions and log them."""
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"[UNHANDLED EXCEPTION] {request.method} {request.url.path}")
        logger.error(f"  Exception: {type(exc).__name__}: {exc}")
        logger.error(f"  Traceback:\n{error_trace}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(exc)}"},
        )
    
    # ============== Routes ==============
    
    # Health check
    @app.get("/", tags=["Health"])
    def root():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "app": settings.app_name,
            "version": settings.app_version,
        }
    
    @app.get("/health", tags=["Health"])
    def health_check():
        """Detailed health check."""
        return {
            "status": "healthy",
            "database": "connected",  # TODO: Add actual DB check
            "cache": "connected",  # TODO: Add Redis check
        }
    
    @app.get("/cors-test", tags=["Health"])
    def cors_test(request: Request):
        """Test CORS configuration."""
        return {
            "status": "ok",
            "cors_enabled": True,
            "origin": request.headers.get("origin", "No Origin"),
            "method": request.method,
            "headers": dict(request.headers),
        }
    
    # Include API router
    app.include_router(api_router, prefix="/api/v1")
    
    return app


# Create application instance
app = create_app()


# ============== Development Server ==============

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
