"""
Vendor Module Tests
Tests for vendor registration, profile, and admin management
"""

import pytest
from fastapi import status


class TestVendorRegistration:
    """Tests for vendor registration."""
    
    def test_register_vendor(self, client, db):
        """Test successful vendor registration."""
        # First register as vendor user
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newvendor@test.com",
                "password": "VendorPass123",
                "name": "New Vendor",
                "role": "vendor",
            },
        )
        assert register_response.status_code == status.HTTP_201_CREATED
        
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "newvendor@test.com",
                "password": "VendorPass123",
            },
        )
        token = login_response.json()["access_token"]
        
        # Register vendor profile
        response = client.post(
            "/api/v1/vendor/register",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "shop_name": "My New Shop",
                "address_line_1": "123 Main Street",
                "city": "Banda",
                "state": "Uttar Pradesh",
                "pincode": "210001",
                "phone": "9876543210",
                "latitude": 25.4758,
                "longitude": 80.3363,
                "delivery_radius_km": 10,
            },
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["shop_name"] == "My New Shop"
        assert data["is_verified"] == False  # Pending approval
    
    def test_register_vendor_duplicate(self, client, verified_vendor_token):
        """Test that vendor cannot register twice."""
        response = client.post(
            "/api/v1/vendor/register",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={
                "shop_name": "Duplicate Shop",
                "address_line_1": "123 Street",
                "city": "Banda",
                "state": "UP",
                "pincode": "210001",
            },
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"].lower()


class TestVendorProfile:
    """Tests for vendor profile operations."""
    
    def test_get_vendor_profile(self, client, verified_vendor_token, test_vendor):
        """Test getting vendor profile."""
        response = client.get(
            "/api/v1/vendor/profile",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["shop_name"] == "Test Shop"
    
    def test_update_vendor_profile(self, client, verified_vendor_token, test_vendor):
        """Test updating vendor profile."""
        response = client.put(
            "/api/v1/vendor/profile",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={
                "shop_name": "Updated Shop Name",
                "description": "A great shop",
            },
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["shop_name"] == "Updated Shop Name"
        assert data["description"] == "A great shop"


class TestPublicVendorAPI:
    """Tests for public vendor endpoints."""
    
    def test_list_vendors(self, client, test_vendor):
        """Test listing vendors."""
        response = client.get("/api/v1/vendor/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert data["total"] >= 1
    
    def test_get_vendor_public(self, client, test_vendor):
        """Test getting vendor public info."""
        response = client.get(f"/api/v1/vendor/{test_vendor['id']}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["shop_name"] == "Test Shop"
    
    def test_check_vendor_delivery(self, client, test_vendor):
        """Test checking vendor delivery availability."""
        response = client.get(
            f"/api/v1/vendor/{test_vendor['id']}/delivery-check",
            params={"latitude": 25.4758, "longitude": 80.3363},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "can_deliver" in data


class TestAdminVendorManagement:
    """Tests for admin vendor management."""
    
    def test_list_pending_vendors(self, client, admin_token, unverified_vendor_user):
        """Test listing pending vendors."""
        response = client.get(
            "/api/v1/admin/vendors/pending",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
    
    def test_approve_vendor(self, client, admin_token, db, unverified_vendor_user):
        """Test approving a vendor."""
        from app.models import Vendor
        
        vendor = db.query(Vendor).filter(
            Vendor.user_id == unverified_vendor_user.id
        ).first()
        
        response = client.put(
            f"/api/v1/admin/vendors/{vendor.id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_verified": True, "commission_percent": 8},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["is_verified"] == True
        assert data["commission_percent"] == "8"
    
    def test_suspend_vendor(self, client, admin_token, test_vendor):
        """Test suspending a vendor."""
        response = client.put(
            f"/api/v1/admin/vendors/{test_vendor['id']}/suspend",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_active": False, "reason": "Policy violation"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["is_active"] == False
    
    def test_non_admin_cannot_approve(self, client, verified_vendor_token, test_vendor):
        """Test that non-admin cannot approve vendors."""
        response = client.put(
            f"/api/v1/admin/vendors/{test_vendor['id']}/approve",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={"is_verified": True},
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

