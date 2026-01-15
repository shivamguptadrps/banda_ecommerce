"""
Category Module Tests
Tests for category management and browsing
"""

import pytest
from fastapi import status


class TestPublicCategoryAPI:
    """Tests for public category endpoints."""
    
    def test_list_categories(self, client, test_category):
        """Test listing categories."""
        response = client.get("/api/v1/categories/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert data["total"] >= 1
    
    def test_get_category_tree(self, client, test_category):
        """Test getting category tree."""
        response = client.get("/api/v1/categories/tree")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
    
    def test_get_root_categories(self, client, test_category):
        """Test getting root categories."""
        response = client.get("/api/v1/categories/root")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_category_by_id(self, client, test_category):
        """Test getting category by ID."""
        response = client.get(f"/api/v1/categories/{test_category['id']}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Fruits"
        assert "breadcrumb" in data
    
    def test_get_category_by_slug(self, client, test_category):
        """Test getting category by slug."""
        response = client.get("/api/v1/categories/slug/fruits")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["slug"] == "fruits"


class TestAdminCategoryManagement:
    """Tests for admin category management."""
    
    def test_create_category(self, client, admin_token):
        """Test creating a category."""
        response = client.post(
            "/api/v1/admin/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Vegetables",
                "description": "Fresh vegetables",
            },
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Vegetables"
        assert data["slug"] == "vegetables"
    
    def test_create_subcategory(self, client, admin_token, test_category):
        """Test creating a subcategory."""
        response = client.post(
            "/api/v1/admin/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Citrus Fruits",
                "parent_id": test_category["id"],
            },
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["parent_id"] == test_category["id"]
    
    def test_update_category(self, client, admin_token, test_category):
        """Test updating a category."""
        response = client.put(
            f"/api/v1/admin/categories/{test_category['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Fresh Fruits", "description": "Updated description"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Fresh Fruits"
    
    def test_delete_category(self, client, admin_token, test_category):
        """Test deleting (deactivating) a category."""
        response = client.delete(
            f"/api/v1/admin/categories/{test_category['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify category is inactive (not visible publicly)
        public_response = client.get(f"/api/v1/categories/{test_category['id']}")
        assert public_response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_non_admin_cannot_create(self, client, verified_vendor_token):
        """Test that non-admin cannot create categories."""
        response = client.post(
            "/api/v1/admin/categories",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={"name": "Test Category"},
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestCategoryHierarchy:
    """Tests for category hierarchy operations."""
    
    def test_get_children(self, client, admin_token, test_category):
        """Test getting child categories."""
        # Create subcategory
        client.post(
            "/api/v1/admin/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Apples",
                "parent_id": test_category["id"],
            },
        )
        
        response = client.get(f"/api/v1/categories/{test_category['id']}/children")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_category_cannot_be_own_parent(self, client, admin_token, test_category):
        """Test that category cannot be its own parent."""
        response = client.put(
            f"/api/v1/admin/categories/{test_category['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"parent_id": test_category["id"]},
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

