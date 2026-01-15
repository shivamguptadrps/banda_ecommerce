"""
Product Module Tests
Tests for product, sell units, images, and inventory
"""

import pytest
from decimal import Decimal
from fastapi import status


class TestProductCreation:
    """Tests for product creation."""
    
    def test_create_product_success(self, client, verified_vendor_token, test_category):
        """Test successful product creation."""
        response = client.post(
            "/api/v1/vendor/products/",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={
                "name": "Fresh Apples",
                "description": "Red delicious apples from Himachal",
                "stock_unit": "kg",
                "category_id": str(test_category["id"]),
                "initial_stock": 100,
                "low_stock_threshold": 10,
                "sell_units": [
                    {"label": "500g", "unit_value": 0.5, "price": 60},
                    {"label": "1 Kg", "unit_value": 1, "price": 110},
                ]
            },
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Fresh Apples"
        assert data["stock_unit"] == "kg"
        assert len(data["sell_units"]) == 2
        assert data["inventory"]["available_quantity"] == "100"
    
    def test_create_product_without_sell_units(self, client, verified_vendor_token):
        """Test creating product without sell units."""
        response = client.post(
            "/api/v1/vendor/products/",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={
                "name": "Test Product",
                "stock_unit": "piece",
                "initial_stock": 50,
            },
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Test Product"
        assert len(data["sell_units"]) == 0
    
    def test_create_product_unverified_vendor(self, client, unverified_vendor_token):
        """Test that unverified vendor cannot create products."""
        response = client.post(
            "/api/v1/vendor/products/",
            headers={"Authorization": f"Bearer {unverified_vendor_token}"},
            json={
                "name": "Test Product",
                "stock_unit": "piece",
            },
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_create_product_invalid_category(self, client, verified_vendor_token):
        """Test creating product with invalid category."""
        response = client.post(
            "/api/v1/vendor/products/",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={
                "name": "Test Product",
                "stock_unit": "piece",
                "category_id": "00000000-0000-0000-0000-000000000000",
            },
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "category" in response.json()["detail"].lower()


class TestProductCRUD:
    """Tests for product CRUD operations."""
    
    def test_list_vendor_products(self, client, verified_vendor_token, test_product):
        """Test listing vendor's products."""
        response = client.get(
            "/api/v1/vendor/products/",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1
    
    def test_get_product_details(self, client, verified_vendor_token, test_product):
        """Test getting product details."""
        response = client.get(
            f"/api/v1/vendor/products/{test_product['id']}",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_product["id"]
    
    def test_update_product(self, client, verified_vendor_token, test_product):
        """Test updating product."""
        response = client.put(
            f"/api/v1/vendor/products/{test_product['id']}",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={"name": "Updated Product Name", "description": "New description"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Product Name"
        assert data["description"] == "New description"
    
    def test_delete_product(self, client, verified_vendor_token, test_product):
        """Test soft deleting product."""
        response = client.delete(
            f"/api/v1/vendor/products/{test_product['id']}",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify product is deleted (not accessible)
        response = client.get(
            f"/api/v1/vendor/products/{test_product['id']}",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_get_nonexistent_product(self, client, verified_vendor_token):
        """Test getting non-existent product."""
        response = client.get(
            "/api/v1/vendor/products/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestSellUnits:
    """Tests for sell unit operations."""
    
    def test_add_sell_unit(self, client, verified_vendor_token, test_product):
        """Test adding sell unit to product."""
        response = client.post(
            f"/api/v1/vendor/products/{test_product['id']}/sell-units",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={"label": "2 Kg Pack", "unit_value": 2, "price": 200},
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["label"] == "2 Kg Pack"
        assert data["unit_value"] == "2"
        assert data["price"] == "200"
    
    def test_add_sell_unit_with_discount(self, client, verified_vendor_token, test_product):
        """Test adding sell unit with compare price."""
        response = client.post(
            f"/api/v1/vendor/products/{test_product['id']}/sell-units",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={
                "label": "1 Kg",
                "unit_value": 1,
                "price": 90,
                "compare_price": 120,
            },
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["compare_price"] == "120"
        assert data["discount_percent"] == 25  # (120-90)/120 * 100 = 25%
    
    def test_update_sell_unit(self, client, verified_vendor_token, test_product):
        """Test updating sell unit."""
        # First create a sell unit
        create_response = client.post(
            f"/api/v1/vendor/products/{test_product['id']}/sell-units",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={"label": "Test Unit", "unit_value": 1, "price": 100},
        )
        sell_unit_id = create_response.json()["id"]
        
        # Update it
        response = client.put(
            f"/api/v1/vendor/products/{test_product['id']}/sell-units/{sell_unit_id}",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={"price": 95, "label": "Updated Unit"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["price"] == "95"
        assert data["label"] == "Updated Unit"
    
    def test_delete_sell_unit(self, client, verified_vendor_token, test_product):
        """Test deleting sell unit."""
        # First create a sell unit
        create_response = client.post(
            f"/api/v1/vendor/products/{test_product['id']}/sell-units",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={"label": "To Delete", "unit_value": 1, "price": 100},
        )
        sell_unit_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(
            f"/api/v1/vendor/products/{test_product['id']}/sell-units/{sell_unit_id}",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK


class TestInventory:
    """Tests for inventory operations."""
    
    def test_get_inventory(self, client, verified_vendor_token, test_product):
        """Test getting product inventory."""
        response = client.get(
            f"/api/v1/vendor/products/{test_product['id']}/inventory",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "available_quantity" in data
        assert "reserved_quantity" in data
    
    def test_set_stock(self, client, verified_vendor_token, test_product):
        """Test setting absolute stock."""
        response = client.put(
            f"/api/v1/vendor/products/{test_product['id']}/stock?quantity=150",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["available_quantity"] == "150"
    
    def test_adjust_stock_add(self, client, verified_vendor_token, test_product):
        """Test adding to stock."""
        # Set initial stock
        client.put(
            f"/api/v1/vendor/products/{test_product['id']}/stock?quantity=100",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        # Add stock
        response = client.post(
            f"/api/v1/vendor/products/{test_product['id']}/stock/adjust",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={"quantity": 50, "reason": "New shipment arrived"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["available_quantity"] == "150"
    
    def test_adjust_stock_subtract(self, client, verified_vendor_token, test_product):
        """Test subtracting from stock."""
        # Set initial stock
        client.put(
            f"/api/v1/vendor/products/{test_product['id']}/stock?quantity=100",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        # Subtract stock
        response = client.post(
            f"/api/v1/vendor/products/{test_product['id']}/stock/adjust",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={"quantity": -30, "reason": "Damaged goods"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["available_quantity"] == "70"
    
    def test_adjust_stock_negative_error(self, client, verified_vendor_token, test_product):
        """Test that stock cannot go negative."""
        # Set initial stock
        client.put(
            f"/api/v1/vendor/products/{test_product['id']}/stock?quantity=10",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        # Try to subtract more than available
        response = client.post(
            f"/api/v1/vendor/products/{test_product['id']}/stock/adjust",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={"quantity": -20},
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "negative" in response.json()["detail"].lower()
    
    def test_low_stock_products(self, client, verified_vendor_token, test_product):
        """Test getting low stock products."""
        # Set low stock
        client.put(
            f"/api/v1/vendor/products/{test_product['id']}/stock?quantity=5",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        response = client.get(
            "/api/v1/vendor/products/low-stock",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)


class TestPublicProductBrowsing:
    """Tests for public product browsing."""
    
    def test_browse_all_products(self, client, test_public_product):
        """Test browsing all products."""
        response = client.get("/api/v1/products/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1
    
    def test_search_products(self, client, test_public_product):
        """Test searching products."""
        response = client.get(
            "/api/v1/products/search",
            params={"q": "Apple"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
    
    def test_filter_by_category(self, client, test_public_product, test_category):
        """Test filtering products by category."""
        response = client.get(
            f"/api/v1/products/category/{test_category['id']}",
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
    
    def test_filter_by_vendor(self, client, test_public_product, test_vendor):
        """Test filtering products by vendor."""
        response = client.get(
            f"/api/v1/products/vendor/{test_vendor['id']}",
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
    
    def test_filter_in_stock_only(self, client, test_public_product):
        """Test filtering in-stock products only."""
        response = client.get(
            "/api/v1/products/",
            params={"in_stock_only": True},
        )
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_get_product_details_public(self, client, test_public_product):
        """Test getting public product details."""
        response = client.get(
            f"/api/v1/products/{test_public_product['id']}",
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_public_product["id"]
        assert "vendor_name" in data
        assert "sell_units" in data
    
    def test_get_product_sell_units(self, client, test_public_product):
        """Test getting product sell units."""
        response = client.get(
            f"/api/v1/products/{test_public_product['id']}/sell-units",
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_inactive_product_not_found(self, client, test_product, verified_vendor_token):
        """Test that inactive products are not publicly visible."""
        # Deactivate the product
        client.put(
            f"/api/v1/vendor/products/{test_product['id']}",
            headers={"Authorization": f"Bearer {verified_vendor_token}"},
            json={"is_active": False},
        )
        
        # Try to access publicly
        response = client.get(f"/api/v1/products/{test_product['id']}")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestProductPagination:
    """Tests for product pagination."""
    
    def test_pagination_params(self, client):
        """Test pagination parameters."""
        response = client.get(
            "/api/v1/products/",
            params={"page": 1, "size": 5},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["page"] == 1
        assert data["size"] == 5
        assert "pages" in data
    
    def test_pagination_invalid_page(self, client):
        """Test invalid page number."""
        response = client.get(
            "/api/v1/products/",
            params={"page": 0},
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_pagination_max_size(self, client):
        """Test max page size limit."""
        response = client.get(
            "/api/v1/products/",
            params={"size": 200},
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

