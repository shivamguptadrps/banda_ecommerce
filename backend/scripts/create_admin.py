#!/usr/bin/env python3
"""
Script to create an admin user in the database.

Usage:
    python scripts/create_admin.py
    
    Or with custom values:
    python scripts/create_admin.py --email admin@banda.com --password SecurePass123 --name "Super Admin"
"""

import argparse
import sys
import io
from pathlib import Path

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.user import User
from app.models.enums import UserRole
from app.utils.security import hash_password


def create_admin(email: str, password: str, name: str, phone: str = "9999999999"):
    """Create an admin user in the database."""
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"❌ User with email {email} already exists!")
            if existing.role == UserRole.ADMIN:
                print("   This user is already an admin.")
            else:
                print(f"   Current role: {existing.role.value}")
                update = input("   Update to admin? (y/n): ")
                if update.lower() == 'y':
                    existing.role = UserRole.ADMIN
                    db.commit()
                    print("✅ User updated to admin role!")
            return
        
        # Create new admin user
        admin = User(
            email=email,
            password_hash=hash_password(password),
            name=name,
            phone=phone,
            role=UserRole.ADMIN,
            is_active=True,
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("✅ Admin user created successfully!")
        print(f"   Email: {email}")
        print(f"   Name: {name}")
        print(f"   Role: admin")
        print(f"\n   You can now login at /login with these credentials.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin: {e}")
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Create an admin user")
    parser.add_argument(
        "--email",
        default="admin@banda.com",
        help="Admin email (default: admin@banda.com)"
    )
    parser.add_argument(
        "--password",
        default="Admin@123",
        help="Admin password (default: Admin@123)"
    )
    parser.add_argument(
        "--name",
        default="Banda Admin",
        help="Admin name (default: Banda Admin)"
    )
    parser.add_argument(
        "--phone",
        default="9999999999",
        help="Admin phone (default: 9999999999)"
    )
    
    args = parser.parse_args()
    
    print("\n🔐 Creating Admin User...")
    print("-" * 40)
    
    create_admin(
        email=args.email,
        password=args.password,
        name=args.name,
        phone=args.phone
    )


if __name__ == "__main__":
    main()

