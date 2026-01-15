"""
Authentication Tests
"""

import pytest
from fastapi import status


class TestRegistration:
    """Tests for user registration."""
    
    def test_register_buyer(self, client, test_user_data):
        """Test successful buyer registration."""
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["name"] == test_user_data["name"]
        assert data["role"] == "buyer"
        assert "id" in data
        assert "password" not in data
        assert "password_hash" not in data
    
    def test_register_vendor(self, client, test_vendor_data):
        """Test successful vendor registration."""
        response = client.post("/api/v1/auth/register", json=test_vendor_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["role"] == "vendor"
    
    def test_register_duplicate_email(self, client, test_user_data):
        """Test registration with duplicate email."""
        # First registration
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Second registration with same email
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already registered" in response.json()["detail"].lower()
    
    def test_register_invalid_email(self, client, test_user_data):
        """Test registration with invalid email."""
        test_user_data["email"] = "invalid-email"
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_register_weak_password(self, client, test_user_data):
        """Test registration with weak password."""
        test_user_data["password"] = "weak"
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_register_admin_forbidden(self, client, test_user_data):
        """Test that admin role cannot be self-assigned."""
        test_user_data["role"] = "admin"
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestLogin:
    """Tests for user login."""
    
    def test_login_success(self, client, test_user_data):
        """Test successful login."""
        # Register first
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Login
        response = client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"],
        })
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_wrong_password(self, client, test_user_data):
        """Test login with wrong password."""
        # Register first
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Login with wrong password
        response = client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": "WrongPassword123",
        })
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent email."""
        response = client.post("/api/v1/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "Password123",
        })
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestTokenRefresh:
    """Tests for token refresh."""
    
    def test_refresh_token(self, client, test_user_data):
        """Test token refresh."""
        # Register and login
        client.post("/api/v1/auth/register", json=test_user_data)
        login_response = client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"],
        })
        refresh_token = login_response.json()["refresh_token"]
        
        # Refresh
        response = client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
    
    def test_refresh_invalid_token(self, client):
        """Test refresh with invalid token."""
        response = client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid-token",
        })
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestCurrentUser:
    """Tests for current user endpoints."""
    
    def test_get_current_user(self, client, test_user_data):
        """Test getting current user profile."""
        # Register and login
        client.post("/api/v1/auth/register", json=test_user_data)
        login_response = client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"],
        })
        access_token = login_response.json()["access_token"]
        
        # Get profile
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == test_user_data["email"]
    
    def test_get_current_user_unauthorized(self, client):
        """Test getting profile without token."""
        response = client.get("/api/v1/auth/me")
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_update_current_user(self, client, test_user_data):
        """Test updating current user profile."""
        # Register and login
        client.post("/api/v1/auth/register", json=test_user_data)
        login_response = client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"],
        })
        access_token = login_response.json()["access_token"]
        
        # Update profile
        response = client.put(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"name": "Updated Name"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == "Updated Name"


class TestPasswordChange:
    """Tests for password change."""
    
    def test_change_password(self, client, test_user_data):
        """Test changing password."""
        # Register and login
        client.post("/api/v1/auth/register", json=test_user_data)
        login_response = client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"],
        })
        access_token = login_response.json()["access_token"]
        
        # Change password
        response = client.put(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "current_password": test_user_data["password"],
                "new_password": "NewPassword123",
            },
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Try login with new password
        login_response = client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": "NewPassword123",
        })
        assert login_response.status_code == status.HTTP_200_OK
    
    def test_change_password_wrong_current(self, client, test_user_data):
        """Test changing password with wrong current password."""
        # Register and login
        client.post("/api/v1/auth/register", json=test_user_data)
        login_response = client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"],
        })
        access_token = login_response.json()["access_token"]
        
        # Change password with wrong current
        response = client.put(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "current_password": "WrongPassword123",
                "new_password": "NewPassword123",
            },
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

