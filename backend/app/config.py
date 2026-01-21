"""
Application Configuration
Loads settings from environment variables
"""

import json
from functools import lru_cache
from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Application
    app_name: str = "Banda E-Commerce"
    app_version: str = "1.0.0"
    debug: bool = False
    secret_key: str = "change-this-secret-key-in-production"
    
    # Database
    database_url: str = "postgresql://postgres:password@localhost:5432/banda_ecommerce"
    
    # JWT
    jwt_secret_key: str = "change-this-jwt-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-south-1"
    s3_bucket_name: str = ""
    
    # Cloudinary
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    
    # Razorpay
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    
    # CORS
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:19006",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
        "http://127.0.0.1:19006",
        # Allow network access for mobile devices (dynamically added)
        # Network IPs are added at runtime via environment variable
        "exp://192.168.*.*:*",  # Expo dev server
        "http://192.168.*.*:*",  # Local network IPs for mobile devices
        "*",  # Allow all origins in development (remove in production)
    ]
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse CORS_ORIGINS from JSON string if provided."""
        if isinstance(v, str):
            try:
                # Try to parse as JSON array
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, TypeError):
                # If not JSON, treat as comma-separated string
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    # Pagination
    default_page_size: int = 20
    max_page_size: int = 100
    
    # Warehouse/Delivery Settings
    warehouse_latitude: float = 28.6289  # Default: Ghaziabad
    warehouse_longitude: float = 77.4422
    warehouse_name: str = "Banda Bazaar Warehouse"
    max_delivery_radius_km: float = 10.0  # Maximum delivery distance (can be overridden via MAX_DELIVERY_RADIUS_KM env var)
    base_prep_time_minutes: int = 5  # Average order preparation time
    delivery_speed_km_per_min: float = 0.5  # ~30 km/h average speed


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

