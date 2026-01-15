"""
Database Configuration
SQLAlchemy async engine and session management
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings


# Create SQLAlchemy engine
engine = create_engine(
    settings.database_url,
    echo=settings.debug,  # Log SQL queries in debug mode
    pool_pre_ping=True,  # Verify connections before use
    pool_size=10,
    max_overflow=20,
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def check_database_connection():
    """
    Check if database connection is available.
    Raises an error if connection fails.
    
    Raises:
        ConnectionError: If database connection fails
    """
    try:
        with engine.connect() as connection:
            # Execute a simple query to test connection
            connection.execute(text("SELECT 1"))
        print("[SUCCESS] Database connection successful")
    except SQLAlchemyError as e:
        error_msg = f"[FAILED] Database connection failed: {str(e)}"
        print(error_msg)
        raise ConnectionError(error_msg) from e
    except Exception as e:
        error_msg = f"[ERROR] Unexpected error while connecting to database: {str(e)}"
        print(error_msg)
        raise ConnectionError(error_msg) from e


def get_db():
    """
    Dependency that provides a database session.
    Yields a session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.
    Should only be used in development; use Alembic migrations in production.
    """
    Base.metadata.create_all(bind=engine)

