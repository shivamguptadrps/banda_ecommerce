"""
Pytest Configuration and Fixtures
"""

import pytest
import uuid
from typing import Generator
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.enums import UserRole, StockUnit
from app.utils.security import hash_password, create_access_token


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator:
    """
    Create a fresh database for each test.
    """
    # Import models to ensure they're registered
    from app.models import User, Vendor, Category, Product, SellUnit, Inventory
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db) -> Generator:
    """
    Create a test client with database override.
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


# ============== User Fixtures ==============

@pytest.fixture
def test_user_data():
    """Sample user data for testing."""
    return {
        "email": "test@example.com",
        "password": "TestPassword123",
        "name": "Test User",
        "phone": "9876543210",
        "role": "buyer",
    }


@pytest.fixture
def test_vendor_data():
    """Sample vendor user data for testing."""
    return {
        "email": "vendor@example.com",
        "password": "VendorPass123",
        "name": "Test Vendor",
        "phone": "9876543211",
        "role": "vendor",
    }


@pytest.fixture
def test_admin_data():
    """Sample admin user data for testing."""
    return {
        "email": "admin@example.com",
        "password": "AdminPass123",
        "name": "Test Admin",
        "role": "admin",
    }


@pytest.fixture
def test_user(db):
    """Create a test buyer user."""
    from app.models import User
    
    user = User(
        id=uuid.uuid4(),
        email="buyer@test.com",
        password_hash=hash_password("TestPassword123"),
        name="Test Buyer",
        role=UserRole.BUYER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_admin(db):
    """Create a test admin user."""
    from app.models import User
    
    user = User(
        id=uuid.uuid4(),
        email="admin@test.com",
        password_hash=hash_password("AdminPass123"),
        name="Test Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(test_admin):
    """Create admin access token."""
    return create_access_token(test_admin.id, test_admin.role)


# ============== Vendor Fixtures ==============

@pytest.fixture
def test_vendor_user(db):
    """Create a test vendor user."""
    from app.models import User
    
    user = User(
        id=uuid.uuid4(),
        email="vendor@test.com",
        password_hash=hash_password("VendorPass123"),
        name="Test Vendor User",
        role=UserRole.VENDOR,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_vendor(db, test_vendor_user):
    """Create a verified vendor."""
    from app.models import Vendor
    
    vendor = Vendor(
        id=uuid.uuid4(),
        user_id=test_vendor_user.id,
        shop_name="Test Shop",
        address_line_1="123 Test Street",
        city="Banda",
        state="Uttar Pradesh",
        pincode="210001",
        is_verified=True,
        is_active=True,
        latitude=Decimal("25.4758"),
        longitude=Decimal("80.3363"),
        delivery_radius_km=Decimal("10.0"),
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return {"id": str(vendor.id), "user_id": str(test_vendor_user.id)}


@pytest.fixture
def verified_vendor_token(test_vendor_user):
    """Create verified vendor access token."""
    return create_access_token(test_vendor_user.id, test_vendor_user.role)


@pytest.fixture
def unverified_vendor_user(db):
    """Create an unverified vendor user."""
    from app.models import User, Vendor
    
    user = User(
        id=uuid.uuid4(),
        email="unverified@test.com",
        password_hash=hash_password("VendorPass123"),
        name="Unverified Vendor",
        role=UserRole.VENDOR,
        is_active=True,
    )
    db.add(user)
    db.commit()
    
    # Create unverified vendor profile
    vendor = Vendor(
        id=uuid.uuid4(),
        user_id=user.id,
        shop_name="Unverified Shop",
        address_line_1="456 Test Street",
        city="Banda",
        state="Uttar Pradesh",
        pincode="210001",
        is_verified=False,
        is_active=True,
    )
    db.add(vendor)
    db.commit()
    
    return user


@pytest.fixture
def unverified_vendor_token(unverified_vendor_user):
    """Create unverified vendor access token."""
    return create_access_token(unverified_vendor_user.id, unverified_vendor_user.role)


# ============== Category Fixtures ==============

@pytest.fixture
def test_category(db):
    """Create a test category."""
    from app.models import Category
    
    category = Category(
        id=uuid.uuid4(),
        name="Fruits",
        slug="fruits",
        is_active=True,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return {"id": str(category.id), "name": category.name}


# ============== Product Fixtures ==============

@pytest.fixture
def test_product(db, test_vendor, test_category):
    """Create a test product for vendor tests."""
    from app.models import Product, SellUnit, Inventory
    
    vendor_id = uuid.UUID(test_vendor["id"])
    category_id = uuid.UUID(test_category["id"])
    
    product = Product(
        id=uuid.uuid4(),
        vendor_id=vendor_id,
        category_id=category_id,
        name="Test Apples",
        slug="test-apples",
        description="Fresh test apples",
        stock_unit=StockUnit.KG,
        is_active=True,
    )
    db.add(product)
    db.flush()
    
    # Add inventory
    inventory = Inventory(
        id=uuid.uuid4(),
        product_id=product.id,
        available_quantity=Decimal("100"),
        low_stock_threshold=Decimal("10"),
    )
    db.add(inventory)
    
    # Add sell units
    sell_unit = SellUnit(
        id=uuid.uuid4(),
        product_id=product.id,
        label="1 Kg",
        unit_value=Decimal("1"),
        price=Decimal("120"),
        is_active=True,
    )
    db.add(sell_unit)
    
    db.commit()
    db.refresh(product)
    
    return {"id": str(product.id), "name": product.name}


@pytest.fixture
def test_public_product(db, test_vendor, test_category):
    """Create a test product for public browsing tests."""
    from app.models import Product, SellUnit, Inventory
    
    vendor_id = uuid.UUID(test_vendor["id"])
    category_id = uuid.UUID(test_category["id"])
    
    product = Product(
        id=uuid.uuid4(),
        vendor_id=vendor_id,
        category_id=category_id,
        name="Public Apples",
        slug="public-apples",
        description="Apples for public browsing",
        stock_unit=StockUnit.KG,
        is_active=True,
    )
    db.add(product)
    db.flush()
    
    # Add inventory with stock
    inventory = Inventory(
        id=uuid.uuid4(),
        product_id=product.id,
        available_quantity=Decimal("50"),
        low_stock_threshold=Decimal("10"),
    )
    db.add(inventory)
    
    # Add sell units
    sell_unit = SellUnit(
        id=uuid.uuid4(),
        product_id=product.id,
        label="500g",
        unit_value=Decimal("0.5"),
        price=Decimal("60"),
        is_active=True,
    )
    db.add(sell_unit)
    
    db.commit()
    db.refresh(product)
    
    return {"id": str(product.id), "name": product.name}
