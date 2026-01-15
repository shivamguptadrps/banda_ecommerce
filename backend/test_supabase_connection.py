"""
Test Supabase Database Connection
This script tests the connection to your Supabase PostgreSQL database.
"""

import sys
import socket
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from app.config import settings


def test_connection():
    """Test database connection and display connection details."""
    print("=" * 60)
    print("  Supabase Connection Test")
    print("=" * 60)
    print()
    
    # Display connection info (mask password)
    db_url = settings.database_url
    if "@" in db_url:
        # Mask password in connection string
        parts = db_url.split("@")
        if len(parts) == 2:
            user_pass = parts[0].split("://")[-1]
            if ":" in user_pass:
                user = user_pass.split(":")[0]
                masked_url = db_url.split(":")[0] + "://" + user + ":***@" + parts[1]
            else:
                masked_url = db_url
        else:
            masked_url = db_url
    else:
        masked_url = db_url
    
    print(f"Database URL: {masked_url}")
    print()
    
    # Extract hostname from connection string
    try:
        if "@" in db_url:
            hostname = db_url.split("@")[1].split(":")[0]
            print(f"Hostname: {hostname}")
            
            # Check DNS resolution
            try:
                ipv4_addresses = socket.getaddrinfo(hostname, None, socket.AF_INET)
                print(f"IPv4 Address: {ipv4_addresses[0][4][0]}")
            except socket.gaierror:
                print("IPv4: Not available")
            
            try:
                ipv6_addresses = socket.getaddrinfo(hostname, None, socket.AF_INET6)
                print(f"IPv6 Address: {ipv6_addresses[0][4][0]}")
            except socket.gaierror:
                print("IPv6: Not available")
            
            print()
    except Exception as e:
        print(f"Note: Could not parse hostname ({e})")
        print()
    
    try:
        print("Attempting to connect to Supabase...")
        
        # Create engine with connection pool settings
        engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,  # Verify connections before use
            pool_size=1,
            max_overflow=0,
        )
        
        # Test connection
        with engine.connect() as connection:
            # Execute a simple query
            result = connection.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            
            print("[SUCCESS] Connection successful!")
            print()
            print(f"PostgreSQL Version: {version}")
            
            # Get database name
            result = connection.execute(text("SELECT current_database()"))
            db_name = result.fetchone()[0]
            print(f"Database Name: {db_name}")
            
            # Check if we can query tables
            result = connection.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            table_count = result.fetchone()[0]
            print(f"Tables in public schema: {table_count}")
            
            # List some tables if they exist
            if table_count > 0:
                result = connection.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                    LIMIT 10
                """))
                tables = [row[0] for row in result.fetchall()]
                print(f"   Sample tables: {', '.join(tables[:5])}")
                if len(tables) > 5:
                    print(f"   ... and {len(tables) - 5} more")
            
            print()
            print("=" * 60)
            print("[PASSED] Supabase connection test PASSED")
            print("=" * 60)
            return True
            
    except SQLAlchemyError as e:
        print()
        print("[FAILED] Connection failed!")
        print()
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print()
        print("=" * 60)
        print("[FAILED] Supabase connection test FAILED")
        print("=" * 60)
        print()
        print("Troubleshooting tips:")
        print("   1. Check your .env file has the correct DATABASE_URL")
        print("   2. Verify your Supabase project is active (not paused)")
        print("   3. If you see 'could not translate host name', you may need to:")
        print("      - Enable IPv6 on Windows (see ENABLE_IPV6_WINDOWS.md)")
        print("      - OR use Supabase Connection Pooler (port 6543) instead")
        print("        Get it from: Supabase Dashboard > Settings > Database > Connection Pooler")
        print("   4. Check your firewall/network settings")
        print("   5. Make sure you're using the correct password")
        print("   6. Try adding ?sslmode=require to your connection string")
        print()
        return False
        
    except Exception as e:
        print()
        print("[ERROR] Unexpected error occurred!")
        print()
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print()
        print("=" * 60)
        print("[FAILED] Supabase connection test FAILED")
        print("=" * 60)
        return False


if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
