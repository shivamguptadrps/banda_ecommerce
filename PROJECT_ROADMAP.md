# 🛒 Banda E-Commerce Backend - Project Roadmap

> **City-Level E-Commerce Marketplace**  
> A platform where local vendors can register products and city residents can purchase them.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Phase 1: Foundation & Authentication](#phase-1-foundation--authentication)
4. [Phase 2: Vendor & Category Management](#phase-2-vendor--category-management)
5. [Phase 3: Product & Inventory System](#phase-3-product--inventory-system)
6. [Phase 4: Cart & Order Management](#phase-4-cart--order-management)
7. [Phase 5: Payment Integration](#phase-5-payment-integration)
8. [Phase 6: Reviews, Wishlist & Notifications](#phase-6-reviews-wishlist--notifications)
9. [Phase 7: Coupons & Discounts](#phase-7-coupons--discounts)
10. [Phase 8: Returns, Refunds & Vendor Payouts](#phase-8-returns-refunds--vendor-payouts)
11. [Phase 9: Search, Analytics & Optimization](#phase-9-search-analytics--optimization)
12. [Phase 10: Admin Dashboard & Audit](#phase-10-admin-dashboard--audit)
13. [Database Schema Overview](#database-schema-overview)
14. [API Endpoints Summary](#api-endpoints-summary)
15. [Project Structure](#project-structure)

---

## Project Overview

### Business Model
- **Vendors**: Local shop owners register and list their products
- **Buyers**: City residents browse and purchase products
- **Admin**: Platform owner manages vendors, categories, and orders
- **Delivery**: Vendor-managed delivery within city limits

### Key Features
- Multi-vendor marketplace
- Location-based delivery
- Flexible pricing units (kg, piece, bundle)
- Stock reservation system
- Online + COD payments

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | FastAPI (Python 3.11+) |
| **Database** | PostgreSQL 15+ with PostGIS |
| **ORM** | SQLAlchemy 2.0 |
| **Migrations** | Alembic |
| **Authentication** | JWT (PyJWT) + bcrypt |
| **Validation** | Pydantic v2 |
| **File Storage** | AWS S3 / Cloudinary |
| **Payments** | Razorpay |
| **Cache** | Redis |
| **Task Queue** | Celery + Redis |
| **Testing** | Pytest + httpx |
| **API Docs** | Swagger UI (built-in) |

---

## Phase 1: Foundation & Authentication

### 🎯 Goal
Set up project structure, database connection, and complete authentication system.

### 📁 Modules
1. **Project Setup**
2. **Database Configuration**
3. **User Model & Auth**

### 🗄️ Database Tables

#### `users`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| phone | VARCHAR(15) | UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| name | VARCHAR(100) | NOT NULL |
| role | ENUM | (ADMIN, VENDOR, BUYER) |
| is_active | BOOLEAN | DEFAULT TRUE |
| is_email_verified | BOOLEAN | DEFAULT FALSE |
| last_login | TIMESTAMP | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | |

#### `refresh_tokens`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FK → users.id |
| token | VARCHAR(500) | UNIQUE |
| expires_at | TIMESTAMP | NOT NULL |
| is_revoked | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMP | |

### 🔌 API Endpoints

```
POST   /api/v1/auth/register          - Register new user
POST   /api/v1/auth/login             - Login (email/phone + password)
POST   /api/v1/auth/refresh           - Refresh access token
POST   /api/v1/auth/logout            - Logout (revoke refresh token)
GET    /api/v1/auth/me                - Get current user profile
PUT    /api/v1/auth/me                - Update profile
PUT    /api/v1/auth/change-password   - Change password
```

### 📦 Deliverables
- [ ] Project folder structure
- [ ] Environment configuration (.env)
- [ ] Database connection setup
- [ ] Alembic migrations setup
- [ ] User model with SQLAlchemy
- [ ] Pydantic schemas for auth
- [ ] JWT token utilities (create, verify, refresh)
- [ ] Password hashing utilities
- [ ] Auth routes
- [ ] Role-based access middleware
- [ ] Unit tests for auth

### 🔗 Dependencies
- None (First phase)

### ⏱️ Estimated Time
- 2-3 days

---

## Phase 2: Vendor & Category Management

### 🎯 Goal
Allow vendors to register shops and admins to manage categories.

### 📁 Modules
1. **Vendor Onboarding**
2. **Category Management**
3. **Service Area Configuration**

### 🗄️ Database Tables

#### `vendors`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FK → users.id, UNIQUE |
| shop_name | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| logo_url | VARCHAR(500) | |
| address_line_1 | VARCHAR(255) | NOT NULL |
| address_line_2 | VARCHAR(255) | |
| city | VARCHAR(100) | NOT NULL |
| state | VARCHAR(100) | NOT NULL |
| pincode | VARCHAR(10) | NOT NULL |
| latitude | DECIMAL(10,8) | |
| longitude | DECIMAL(11,8) | |
| delivery_radius_km | DECIMAL(5,2) | DEFAULT 5.0 |
| phone | VARCHAR(15) | |
| is_verified | BOOLEAN | DEFAULT FALSE |
| is_active | BOOLEAN | DEFAULT TRUE |
| rating | DECIMAL(2,1) | DEFAULT 0.0 |
| total_orders | INTEGER | DEFAULT 0 |
| commission_percent | DECIMAL(4,2) | DEFAULT 10.0 |
| cod_enabled | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `categories`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(100) | NOT NULL |
| slug | VARCHAR(100) | UNIQUE |
| description | TEXT | |
| image_url | VARCHAR(500) | |
| parent_id | UUID | FK → categories.id (self) |
| display_order | INTEGER | DEFAULT 0 |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `service_zones`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| zone_name | VARCHAR(100) | NOT NULL |
| city | VARCHAR(100) | NOT NULL |
| center_latitude | DECIMAL(10,8) | |
| center_longitude | DECIMAL(11,8) | |
| radius_km | DECIMAL(5,2) | |
| delivery_fee | DECIMAL(10,2) | DEFAULT 0.0 |
| min_order_value | DECIMAL(10,2) | DEFAULT 0.0 |
| estimated_time_mins | INTEGER | DEFAULT 30 |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | |

### 🔌 API Endpoints

```
# Vendor APIs
POST   /api/v1/vendor/register        - Register as vendor
GET    /api/v1/vendor/profile         - Get vendor profile
PUT    /api/v1/vendor/profile         - Update vendor profile
POST   /api/v1/vendor/upload-logo     - Upload shop logo

# Category APIs (Public)
GET    /api/v1/categories             - List all categories
GET    /api/v1/categories/tree        - Get category tree
GET    /api/v1/categories/{id}        - Get category details

# Category APIs (Admin)
POST   /api/v1/admin/categories           - Create category
PUT    /api/v1/admin/categories/{id}      - Update category
DELETE /api/v1/admin/categories/{id}      - Disable category

# Vendor Management (Admin)
GET    /api/v1/admin/vendors              - List all vendors
GET    /api/v1/admin/vendors/pending      - List pending approvals
PUT    /api/v1/admin/vendors/{id}/approve - Approve vendor
PUT    /api/v1/admin/vendors/{id}/suspend - Suspend vendor

# Service Zone (Admin)
POST   /api/v1/admin/service-zones        - Create zone
GET    /api/v1/admin/service-zones        - List zones
PUT    /api/v1/admin/service-zones/{id}   - Update zone
```

### 📦 Deliverables
- [ ] Vendor model and schemas
- [ ] Category model with self-referencing
- [ ] Service zone model
- [ ] Vendor registration flow
- [ ] Admin approval workflow
- [ ] Category CRUD with tree retrieval
- [ ] File upload utility (S3/Cloudinary)
- [ ] Unit tests

### 🔗 Dependencies
- Phase 1 (Auth system)

### ⏱️ Estimated Time
- 2-3 days

---

## Phase 3: Product & Inventory System

### 🎯 Goal
Allow vendors to create products with flexible pricing units and manage inventory.

### 📁 Modules
1. **Product Management**
2. **Product Images**
3. **Sell Units (Pricing)**
4. **Inventory Management**

### 🗄️ Database Tables

#### `products`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| vendor_id | UUID | FK → vendors.id |
| category_id | UUID | FK → categories.id |
| name | VARCHAR(255) | NOT NULL |
| slug | VARCHAR(255) | |
| description | TEXT | |
| stock_unit | ENUM | (KG, PIECE, LITER, METER) |
| is_active | BOOLEAN | DEFAULT TRUE |
| is_deleted | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `product_images`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| product_id | UUID | FK → products.id |
| image_url | VARCHAR(500) | NOT NULL |
| display_order | INTEGER | DEFAULT 0 |
| is_primary | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMP | |

#### `sell_units`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| product_id | UUID | FK → products.id |
| label | VARCHAR(50) | NOT NULL (e.g., "500g", "1 dozen") |
| unit_value | DECIMAL(10,3) | NOT NULL (in stock_unit) |
| price | DECIMAL(10,2) | NOT NULL |
| compare_price | DECIMAL(10,2) | (for showing discount) |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `inventory`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| product_id | UUID | FK → products.id, UNIQUE |
| available_quantity | DECIMAL(10,3) | DEFAULT 0 |
| reserved_quantity | DECIMAL(10,3) | DEFAULT 0 |
| low_stock_threshold | DECIMAL(10,3) | DEFAULT 10 |
| updated_at | TIMESTAMP | |

### 🔌 API Endpoints

```
# Vendor Product APIs
POST   /api/v1/vendor/products                    - Create product
GET    /api/v1/vendor/products                    - List vendor's products
GET    /api/v1/vendor/products/{id}               - Get product details
PUT    /api/v1/vendor/products/{id}               - Update product
DELETE /api/v1/vendor/products/{id}               - Soft delete product

# Product Images
POST   /api/v1/vendor/products/{id}/images        - Upload images
DELETE /api/v1/vendor/products/{id}/images/{img}  - Delete image
PUT    /api/v1/vendor/products/{id}/images/order  - Reorder images

# Sell Units
POST   /api/v1/vendor/products/{id}/sell-units       - Add sell unit
PUT    /api/v1/vendor/products/{id}/sell-units/{sid} - Update sell unit
DELETE /api/v1/vendor/products/{id}/sell-units/{sid} - Delete sell unit

# Inventory
GET    /api/v1/vendor/inventory                   - View all inventory
PUT    /api/v1/vendor/products/{id}/stock         - Update stock

# Public Product APIs (Buyer)
GET    /api/v1/products                           - Browse products
GET    /api/v1/products/{id}                      - Product details
GET    /api/v1/products/category/{category_id}    - Products by category
GET    /api/v1/vendors/{vendor_id}/products       - Products by vendor
```

### 📦 Deliverables
- [ ] Product model with relationships
- [ ] Product images handling
- [ ] Sell unit flexible pricing
- [ ] Inventory model with locking
- [ ] Product CRUD for vendors
- [ ] Product browsing for buyers
- [ ] Stock management utilities
- [ ] Image upload integration
- [ ] Unit tests

### 🔗 Dependencies
- Phase 1 (Auth)
- Phase 2 (Vendor, Category)

### ⏱️ Estimated Time
- 3-4 days

---

## Phase 4: Cart & Order Management

### 🎯 Goal
Implement shopping cart, delivery address, and order placement with stock reservation.

### 📁 Modules
1. **Delivery Address**
2. **Shopping Cart**
3. **Order Placement**
4. **Stock Reservation**

### 🗄️ Database Tables

#### `delivery_addresses`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| buyer_id | UUID | FK → users.id |
| label | VARCHAR(50) | (Home/Office/Other) |
| recipient_name | VARCHAR(100) | NOT NULL |
| recipient_phone | VARCHAR(15) | NOT NULL |
| address_line_1 | VARCHAR(255) | NOT NULL |
| address_line_2 | VARCHAR(255) | |
| city | VARCHAR(100) | NOT NULL |
| state | VARCHAR(100) | NOT NULL |
| pincode | VARCHAR(10) | NOT NULL |
| landmark | VARCHAR(255) | |
| latitude | DECIMAL(10,8) | |
| longitude | DECIMAL(11,8) | |
| is_default | BOOLEAN | DEFAULT FALSE |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `carts`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| buyer_id | UUID | FK → users.id, UNIQUE |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `cart_items`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| cart_id | UUID | FK → carts.id |
| product_id | UUID | FK → products.id |
| sell_unit_id | UUID | FK → sell_units.id |
| quantity | INTEGER | NOT NULL, MIN 1 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| | | UNIQUE(cart_id, sell_unit_id) |

#### `orders`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| order_number | VARCHAR(20) | UNIQUE |
| buyer_id | UUID | FK → users.id |
| vendor_id | UUID | FK → vendors.id |
| delivery_address_id | UUID | FK → delivery_addresses.id |
| delivery_latitude | DECIMAL(10,8) | |
| delivery_longitude | DECIMAL(11,8) | |
| delivery_distance_km | DECIMAL(5,2) | |
| subtotal | DECIMAL(10,2) | NOT NULL |
| delivery_fee | DECIMAL(10,2) | DEFAULT 0 |
| discount_amount | DECIMAL(10,2) | DEFAULT 0 |
| tax_amount | DECIMAL(10,2) | DEFAULT 0 |
| total_amount | DECIMAL(10,2) | NOT NULL |
| payment_mode | ENUM | (ONLINE, COD) |
| payment_status | ENUM | (PENDING, PAID, FAILED, REFUNDED) |
| order_status | ENUM | (see below) |
| notes | TEXT | |
| placed_at | TIMESTAMP | |
| confirmed_at | TIMESTAMP | |
| shipped_at | TIMESTAMP | |
| delivered_at | TIMESTAMP | |
| cancelled_at | TIMESTAMP | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Order Status Enum:**
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
              ↓                       ↓
          CANCELLED              RETURNED
```

#### `order_items`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| order_id | UUID | FK → orders.id |
| product_id | UUID | FK → products.id |
| sell_unit_id | UUID | FK → sell_units.id |
| product_name | VARCHAR(255) | (snapshot) |
| sell_unit_label | VARCHAR(50) | (snapshot) |
| unit_value | DECIMAL(10,3) | (snapshot) |
| quantity | INTEGER | NOT NULL |
| price_per_unit | DECIMAL(10,2) | (snapshot) |
| total_price | DECIMAL(10,2) | |
| created_at | TIMESTAMP | |

#### `stock_reservations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| order_id | UUID | FK → orders.id |
| product_id | UUID | FK → products.id |
| reserved_quantity | DECIMAL(10,3) | NOT NULL |
| expires_at | TIMESTAMP | NOT NULL |
| status | ENUM | (ACTIVE, CONFIRMED, RELEASED) |
| created_at | TIMESTAMP | |

### 🔌 API Endpoints

```
# Delivery Address
POST   /api/v1/buyer/addresses            - Add address
GET    /api/v1/buyer/addresses            - List addresses
GET    /api/v1/buyer/addresses/{id}       - Get address
PUT    /api/v1/buyer/addresses/{id}       - Update address
DELETE /api/v1/buyer/addresses/{id}       - Delete address
PUT    /api/v1/buyer/addresses/{id}/default - Set default

# Cart
GET    /api/v1/cart                       - Get cart
POST   /api/v1/cart/items                 - Add item to cart
PUT    /api/v1/cart/items/{id}            - Update quantity
DELETE /api/v1/cart/items/{id}            - Remove item
DELETE /api/v1/cart                       - Clear cart

# Delivery Check
POST   /api/v1/delivery/check             - Check deliverability
GET    /api/v1/delivery/fee               - Calculate fee

# Orders (Buyer)
POST   /api/v1/orders                     - Place order
GET    /api/v1/orders                     - List my orders
GET    /api/v1/orders/{id}                - Order details
PUT    /api/v1/orders/{id}/cancel         - Cancel order

# Orders (Vendor)
GET    /api/v1/vendor/orders              - List vendor orders
GET    /api/v1/vendor/orders/{id}         - Order details
PUT    /api/v1/vendor/orders/{id}/status  - Update status
```

### 📦 Deliverables
- [ ] Delivery address CRUD
- [ ] Cart management
- [ ] Order placement with validation
- [ ] Stock reservation logic
- [ ] Order status workflow
- [ ] Delivery fee calculation
- [ ] Distance-based checks
- [ ] Cron job for expired reservations
- [ ] Order notifications (basic)
- [ ] Unit tests

### 🔗 Dependencies
- Phase 1-3

### ⏱️ Estimated Time
- 4-5 days

---

## Phase 5: Payment Integration

### 🎯 Goal
Integrate Razorpay for online payments with webhook handling.

### 📁 Modules
1. **Payment Intent Creation**
2. **Webhook Handling**
3. **Payment Verification**
4. **COD Management**

### 🗄️ Database Tables

#### `payments`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| order_id | UUID | FK → orders.id |
| razorpay_order_id | VARCHAR(100) | |
| razorpay_payment_id | VARCHAR(100) | |
| razorpay_signature | VARCHAR(255) | |
| amount | DECIMAL(10,2) | NOT NULL |
| currency | VARCHAR(10) | DEFAULT 'INR' |
| status | ENUM | (CREATED, AUTHORIZED, CAPTURED, FAILED, REFUNDED) |
| method | VARCHAR(50) | (card/upi/netbanking/wallet) |
| failure_reason | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `payment_logs`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| payment_id | UUID | FK → payments.id |
| event_type | VARCHAR(50) | |
| payload | JSONB | |
| created_at | TIMESTAMP | |

### 🔌 API Endpoints

```
# Payment APIs
POST   /api/v1/payments/create-order      - Create Razorpay order
POST   /api/v1/payments/verify            - Verify payment
POST   /api/v1/payments/webhook           - Razorpay webhook
GET    /api/v1/payments/{order_id}        - Get payment status

# Admin
GET    /api/v1/admin/payments             - List all payments
POST   /api/v1/admin/payments/{id}/refund - Initiate refund
```

### 📦 Deliverables
- [ ] Razorpay SDK integration
- [ ] Payment order creation
- [ ] Signature verification
- [ ] Webhook endpoint (secure)
- [ ] Payment status updates
- [ ] Stock confirmation on success
- [ ] Stock release on failure
- [ ] Refund initiation
- [ ] Payment logs
- [ ] Unit tests

### 🔗 Dependencies
- Phase 4 (Orders)

### ⏱️ Estimated Time
- 2-3 days

---

## Phase 6: Reviews, Wishlist & Notifications

### 🎯 Goal
Add product reviews, wishlist functionality, and notification system.

### 📁 Modules
1. **Reviews & Ratings**
2. **Wishlist**
3. **Notifications**

### 🗄️ Database Tables

#### `reviews`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| buyer_id | UUID | FK → users.id |
| product_id | UUID | FK → products.id |
| order_id | UUID | FK → orders.id |
| rating | INTEGER | CHECK (1-5) |
| title | VARCHAR(255) | |
| comment | TEXT | |
| is_verified_purchase | BOOLEAN | DEFAULT TRUE |
| is_visible | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| | | UNIQUE(buyer_id, product_id) |

#### `review_responses`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| review_id | UUID | FK → reviews.id |
| vendor_id | UUID | FK → vendors.id |
| response | TEXT | NOT NULL |
| created_at | TIMESTAMP | |

#### `wishlists`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| buyer_id | UUID | FK → users.id |
| product_id | UUID | FK → products.id |
| created_at | TIMESTAMP | |
| | | UNIQUE(buyer_id, product_id) |

#### `notifications`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FK → users.id |
| type | ENUM | (ORDER, PAYMENT, PROMO, SYSTEM) |
| title | VARCHAR(255) | NOT NULL |
| message | TEXT | |
| data | JSONB | (extra data like order_id) |
| is_read | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMP | |

### 🔌 API Endpoints

```
# Reviews
POST   /api/v1/products/{id}/reviews      - Add review
GET    /api/v1/products/{id}/reviews      - Get product reviews
PUT    /api/v1/reviews/{id}               - Update my review
DELETE /api/v1/reviews/{id}               - Delete my review

# Vendor Review Response
POST   /api/v1/vendor/reviews/{id}/respond - Respond to review

# Wishlist
GET    /api/v1/wishlist                   - Get wishlist
POST   /api/v1/wishlist/{product_id}      - Add to wishlist
DELETE /api/v1/wishlist/{product_id}      - Remove from wishlist

# Notifications
GET    /api/v1/notifications              - Get notifications
PUT    /api/v1/notifications/{id}/read    - Mark as read
PUT    /api/v1/notifications/read-all     - Mark all as read
DELETE /api/v1/notifications/{id}         - Delete notification
```

### 📦 Deliverables
- [ ] Review CRUD with verified purchase check
- [ ] Vendor response to reviews
- [ ] Product rating aggregation
- [ ] Wishlist management
- [ ] Notification CRUD
- [ ] Notification triggers on events
- [ ] Email notification integration (optional)
- [ ] Unit tests

### 🔗 Dependencies
- Phase 4 (Orders for verified purchase)

### ⏱️ Estimated Time
- 2-3 days

---

## Phase 7: Coupons & Discounts

### 🎯 Goal
Implement coupon system with various discount types.

### 📁 Modules
1. **Coupon Management**
2. **Coupon Validation**
3. **Discount Application**

### 🗄️ Database Tables

#### `coupons`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| code | VARCHAR(50) | UNIQUE, NOT NULL |
| description | TEXT | |
| discount_type | ENUM | (PERCENTAGE, FLAT) |
| discount_value | DECIMAL(10,2) | NOT NULL |
| min_order_value | DECIMAL(10,2) | DEFAULT 0 |
| max_discount | DECIMAL(10,2) | (for percentage) |
| valid_from | TIMESTAMP | |
| valid_until | TIMESTAMP | |
| usage_limit | INTEGER | (total uses) |
| per_user_limit | INTEGER | DEFAULT 1 |
| used_count | INTEGER | DEFAULT 0 |
| vendor_id | UUID | FK → vendors.id (NULL = platform) |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `coupon_usages`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| coupon_id | UUID | FK → coupons.id |
| user_id | UUID | FK → users.id |
| order_id | UUID | FK → orders.id |
| discount_amount | DECIMAL(10,2) | |
| created_at | TIMESTAMP | |

### 🔌 API Endpoints

```
# Coupon Validation (Buyer)
POST   /api/v1/coupons/validate           - Validate coupon
POST   /api/v1/coupons/apply              - Apply to cart

# Coupon Management (Admin)
POST   /api/v1/admin/coupons              - Create coupon
GET    /api/v1/admin/coupons              - List coupons
PUT    /api/v1/admin/coupons/{id}         - Update coupon
DELETE /api/v1/admin/coupons/{id}         - Disable coupon

# Vendor Coupons
POST   /api/v1/vendor/coupons             - Create vendor coupon
GET    /api/v1/vendor/coupons             - List vendor coupons
```

### 📦 Deliverables
- [ ] Coupon model
- [ ] Validation logic
- [ ] Usage tracking
- [ ] Per-user limits
- [ ] Vendor-specific coupons
- [ ] Apply coupon to order
- [ ] Unit tests

### 🔗 Dependencies
- Phase 4 (Orders)

### ⏱️ Estimated Time
- 2 days

---

## Phase 7 Implementation: Minimal Maintainable Coupon System (Startup MVP)

### 🎯 Goal
Implement a simple, maintainable coupon system for startup MVP with minimal complexity.

### 📋 Minimal Approach

**For a startup starting out, we recommend:**
- **Cart-wide coupon only** (one coupon per cart)
- **Both percentage and fixed discount types** (flexible for different promotions)
- **Simple validation rules** (5 core validations)
- **Easy to extend later** (can add category-specific, multiple coupons, etc.)

### 🗄️ Simplified Database Structure

#### `coupons` (Minimal MVP)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| code | VARCHAR(50) | UNIQUE, NOT NULL | Coupon code (e.g., "SAVE20") |
| description | TEXT | | Optional description |
| discount_type | ENUM | NOT NULL | `PERCENTAGE` or `FLAT` |
| discount_value | DECIMAL(10,2) | NOT NULL | 20 for 20% or 100 for ₹100 |
| min_order_amount | DECIMAL(10,2) | DEFAULT 0 | Minimum cart value (optional) |
| max_discount | DECIMAL(10,2) | | Max discount cap for percentage (optional) |
| expiry_date | TIMESTAMP | | Coupon expiry |
| usage_limit | INTEGER | | Total times can be used globally (optional) |
| used_count | INTEGER | DEFAULT 0 | Track usage |
| is_active | BOOLEAN | DEFAULT TRUE | Enable/disable coupon |
| created_at | TIMESTAMP | | |
| updated_at | TIMESTAMP | | |

#### `coupon_usages` (Track Usage)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| coupon_id | UUID | FK → coupons.id | |
| user_id | UUID | FK → users.id | |
| order_id | UUID | FK → orders.id | |
| discount_amount | DECIMAL(10,2) | | Actual discount applied |
| created_at | TIMESTAMP | | |

**Note:** For MVP, skip per-user limits initially. Can add `per_user_limit` column later if needed.

### 🔌 Minimal API Endpoints

```
# Cart Coupon APIs (Buyer)
POST   /api/v1/cart/apply-coupon       - Apply coupon to cart
DELETE /api/v1/cart/remove-coupon      - Remove coupon from cart

# Coupon Management (Admin)
POST   /api/v1/admin/coupons            - Create coupon
GET    /api/v1/admin/coupons            - List all coupons
PUT    /api/v1/admin/coupons/{id}       - Update coupon
DELETE /api/v1/admin/coupons/{id}       - Disable coupon (soft delete)
```

### ✅ Minimal Validation Rules

1. **Coupon exists and is active**
   - Check `is_active = TRUE`
   - Check coupon code exists

2. **Not expired**
   - Check `expiry_date > NOW()`

3. **Minimum order amount met** (if set)
   - Check `cart.subtotal >= coupon.min_order_amount`

4. **Usage limit not exceeded** (if set)
   - Check `coupon.used_count < coupon.usage_limit`

5. **One coupon per cart**
   - Only one coupon can be applied at a time
   - Remove existing coupon before applying new one

### 💰 Discount Calculation Logic

**For Percentage Discount:**
```python
discount = (cart.subtotal * discount_value) / 100
if max_discount:
    discount = min(discount, max_discount)
```

**For Fixed Discount:**
```python
discount = discount_value  # e.g., ₹100
```

**Final Total:**
```python
total = subtotal + delivery_fee - discount
```

### 📝 Implementation Flow

#### Backend Service Logic

```python
# services/coupon_service.py

def validate_coupon(coupon_code: str, cart: Cart) -> dict:
    """
    Validate coupon and return discount amount.
    
    Returns:
        {
            "valid": bool,
            "discount_amount": Decimal,
            "message": str
        }
    """
    # 1. Check coupon exists and active
    # 2. Check not expired
    # 3. Check minimum order amount
    # 4. Check usage limit
    # 5. Calculate discount
    # 6. Return result

def apply_coupon_to_cart(cart_id: UUID, coupon_code: str) -> Cart:
    """
    Apply coupon to cart.
    - Remove existing coupon if any
    - Validate new coupon
    - Update cart with coupon
    - Recalculate cart total
    """
    pass

def remove_coupon_from_cart(cart_id: UUID) -> Cart:
    """
    Remove coupon from cart and recalculate.
    """
    pass
```

#### Cart Model Updates

Add to `carts` table:
```sql
ALTER TABLE carts ADD COLUMN coupon_id UUID REFERENCES coupons(id);
ALTER TABLE carts ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
```

#### Order Integration

When creating order:
- Snapshot coupon code in order
- Store discount amount in `order.discount_amount`
- Record usage in `coupon_usages` table
- Increment `coupons.used_count`

### 🎨 Frontend Integration

**Cart Screen:**
- Input field: "Have a coupon code?"
- Apply button
- Display applied coupon with discount
- Remove coupon button

**Checkout Screen:**
- Show applied coupon in order summary
- Display discount amount
- Final total calculation

### 📊 Example Coupons

1. **Percentage with Cap:**
   - Code: "WELCOME10"
   - Type: PERCENTAGE
   - Value: 10
   - Max Discount: ₹100
   - Min Order: ₹500

2. **Fixed Amount:**
   - Code: "FLAT50"
   - Type: FLAT
   - Value: 50
   - Min Order: ₹500

3. **Unlimited Percentage:**
   - Code: "SAVE20"
   - Type: PERCENTAGE
   - Value: 20
   - No max discount
   - No min order

### 🚀 Future Extensibility

When ready to scale, easily add:
- Category-specific coupons (add `category_id` column)
- Per-user usage limits (add `per_user_limit` column)
- Multiple coupons (change to one-to-many relationship)
- Vendor-specific coupons (add `vendor_id` column)
- Complex stacking rules (add `stackable` boolean)

### ⚠️ What to Skip for MVP

- ❌ Category-specific coupons
- ❌ Multiple coupons per cart
- ❌ Product-specific coupons
- ❌ Complex stacking rules
- ❌ Per-user usage limits (global only)
- ❌ Coupon combinations

### 📋 Implementation Checklist

**Backend:**
- [ ] Create `coupons` table migration
- [ ] Create `coupon_usages` table migration
- [ ] Add `coupon_id` and `discount_amount` to `carts` table
- [ ] Create Coupon model (SQLAlchemy)
- [ ] Create Coupon schemas (Pydantic)
- [ ] Implement `CouponService` with validation logic
- [ ] Add `apply_coupon` endpoint to cart API
- [ ] Add `remove_coupon` endpoint to cart API
- [ ] Update cart calculation to include discount
- [ ] Integrate coupon snapshot in order creation
- [ ] Record coupon usage on order placement
- [ ] Admin CRUD endpoints for coupons
- [ ] Unit tests for validation logic

**Frontend (Web & Mobile):**
- [ ] Coupon input component
- [ ] Apply coupon button
- [ ] Display applied coupon
- [ ] Remove coupon button
- [ ] Show discount in cart summary
- [ ] Show discount in checkout summary
- [ ] Error handling for invalid coupons

### 🔄 Cart Recalculation Flow

```
1. User applies coupon
   ↓
2. Backend validates coupon
   ↓
3. Calculate discount amount
   ↓
4. Update cart:
   - Set coupon_id
   - Set discount_amount
   - Recalculate total = subtotal + delivery_fee - discount_amount
   ↓
5. Return updated cart to frontend
   ↓
6. Frontend displays discount and new total
```

### 🎯 Success Criteria

- ✅ User can apply one coupon per cart
- ✅ Both percentage and fixed discounts work
- ✅ Validation prevents invalid coupon usage
- ✅ Discount correctly calculated and applied
- ✅ Coupon usage tracked in database
- ✅ Order preserves coupon information
- ✅ Admin can create/manage coupons easily

### 💡 Best Practices

1. **Always validate on backend** - Frontend validation is for UX only
2. **Re-validate at checkout** - Coupon might expire between cart and checkout
3. **Snapshot in order** - Store coupon code and discount in order for history
4. **Track usage** - Record every coupon usage for analytics
5. **Soft delete** - Don't hard delete coupons, just mark inactive
6. **Clear error messages** - Tell users exactly why coupon failed

---

**This minimal approach provides a solid foundation that can grow with your business needs!** 🚀

---

## Phase 8: Returns, Refunds & Vendor Payouts

### 🎯 Goal
Handle product returns, refunds, and vendor payment settlements.

### 📁 Modules
1. **Return Requests**
2. **Refund Processing**
3. **Vendor Payouts**

### 🗄️ Database Tables

#### `return_requests`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| order_id | UUID | FK → orders.id |
| order_item_id | UUID | FK → order_items.id |
| buyer_id | UUID | FK → users.id |
| reason | ENUM | (DAMAGED, WRONG_ITEM, QUALITY, OTHER) |
| description | TEXT | |
| images | JSONB | (array of image URLs) |
| status | ENUM | (REQUESTED, APPROVED, REJECTED, COMPLETED) |
| refund_amount | DECIMAL(10,2) | |
| admin_notes | TEXT | |
| created_at | TIMESTAMP | |
| resolved_at | TIMESTAMP | |

#### `refunds`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| order_id | UUID | FK → orders.id |
| payment_id | UUID | FK → payments.id |
| return_request_id | UUID | FK → return_requests.id |
| amount | DECIMAL(10,2) | NOT NULL |
| razorpay_refund_id | VARCHAR(100) | |
| status | ENUM | (INITIATED, PROCESSED, FAILED) |
| failure_reason | TEXT | |
| created_at | TIMESTAMP | |
| processed_at | TIMESTAMP | |

#### `vendor_payouts`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| vendor_id | UUID | FK → vendors.id |
| period_start | DATE | |
| period_end | DATE | |
| total_orders | INTEGER | |
| gross_amount | DECIMAL(10,2) | |
| commission_amount | DECIMAL(10,2) | |
| refund_deductions | DECIMAL(10,2) | |
| net_amount | DECIMAL(10,2) | |
| status | ENUM | (PENDING, PROCESSED, FAILED) |
| transaction_id | VARCHAR(100) | |
| created_at | TIMESTAMP | |
| processed_at | TIMESTAMP | |

#### `vendor_payout_items`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| payout_id | UUID | FK → vendor_payouts.id |
| order_id | UUID | FK → orders.id |
| order_amount | DECIMAL(10,2) | |
| commission | DECIMAL(10,2) | |
| net_amount | DECIMAL(10,2) | |

### 🔌 API Endpoints

```
# Returns (Buyer)
POST   /api/v1/orders/{id}/return         - Request return
GET    /api/v1/returns                    - My return requests
GET    /api/v1/returns/{id}               - Return details

# Returns (Vendor)
GET    /api/v1/vendor/returns             - List returns
PUT    /api/v1/vendor/returns/{id}        - Respond to return

# Returns (Admin)
GET    /api/v1/admin/returns              - All returns
PUT    /api/v1/admin/returns/{id}/approve - Approve return
PUT    /api/v1/admin/returns/{id}/reject  - Reject return

# Refunds (Admin)
POST   /api/v1/admin/refunds              - Process refund
GET    /api/v1/admin/refunds              - List refunds

# Payouts (Vendor)
GET    /api/v1/vendor/payouts             - My payouts
GET    /api/v1/vendor/payouts/{id}        - Payout details
GET    /api/v1/vendor/earnings            - Earnings summary

# Payouts (Admin)
GET    /api/v1/admin/payouts              - All payouts
POST   /api/v1/admin/payouts/generate     - Generate payout batch
PUT    /api/v1/admin/payouts/{id}/process - Process payout
```

### 📦 Deliverables
- [ ] Return request workflow
- [ ] Refund integration with Razorpay
- [ ] Stock restoration on return
- [ ] Payout calculation logic
- [ ] Commission deduction
- [ ] Payout batch generation
- [ ] Payout processing
- [ ] Unit tests

### 🔗 Dependencies
- Phase 5 (Payments)

### ⏱️ Estimated Time
- 3-4 days

---

## Phase 9: Search, Analytics & Optimization

### 🎯 Goal
Implement search functionality and basic analytics.

### 📁 Modules
1. **Full-Text Search**
2. **Vendor Analytics**
3. **Admin Analytics**

### 🗄️ Database Tables

#### `search_history` (optional)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FK → users.id |
| query | VARCHAR(255) | |
| results_count | INTEGER | |
| created_at | TIMESTAMP | |

### 🔌 API Endpoints

```
# Search
GET    /api/v1/search                     - Search products
GET    /api/v1/search/suggestions         - Auto-complete

# Vendor Analytics
GET    /api/v1/vendor/analytics/dashboard - Dashboard stats
GET    /api/v1/vendor/analytics/sales     - Sales report
GET    /api/v1/vendor/analytics/products  - Product performance

# Admin Analytics
GET    /api/v1/admin/analytics/dashboard  - Platform stats
GET    /api/v1/admin/analytics/vendors    - Vendor performance
GET    /api/v1/admin/analytics/revenue    - Revenue report
```

### 📦 Deliverables
- [ ] PostgreSQL full-text search
- [ ] Search filters (category, price, rating)
- [ ] Sorting options
- [ ] Vendor dashboard stats
- [ ] Sales reports
- [ ] Admin platform analytics
- [ ] Caching with Redis
- [ ] Unit tests

### 🔗 Dependencies
- All previous phases

### ⏱️ Estimated Time
- 2-3 days

---

## Phase 10: Admin Dashboard & Audit

### 🎯 Goal
Complete admin functionality and audit logging.

### 📁 Modules
1. **Admin Dashboard**
2. **Audit Logs**
3. **System Settings**

### 🗄️ Database Tables

#### `audit_logs`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FK → users.id |
| entity_type | VARCHAR(50) | |
| entity_id | UUID | |
| action | ENUM | (CREATE, UPDATE, DELETE) |
| old_values | JSONB | |
| new_values | JSONB | |
| ip_address | VARCHAR(50) | |
| user_agent | TEXT | |
| created_at | TIMESTAMP | |

#### `system_settings`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| key | VARCHAR(100) | UNIQUE |
| value | JSONB | |
| description | TEXT | |
| updated_by | UUID | FK → users.id |
| updated_at | TIMESTAMP | |

### 🔌 API Endpoints

```
# Admin Dashboard
GET    /api/v1/admin/dashboard            - Dashboard overview

# User Management
GET    /api/v1/admin/users                - List users
PUT    /api/v1/admin/users/{id}/status    - Activate/deactivate

# Audit Logs
GET    /api/v1/admin/audit-logs           - View audit logs

# System Settings
GET    /api/v1/admin/settings             - Get settings
PUT    /api/v1/admin/settings/{key}       - Update setting
```

### 📦 Deliverables
- [ ] Audit log middleware
- [ ] Admin user management
- [ ] System settings CRUD
- [ ] Platform-wide toggles (COD, etc.)
- [ ] Data export functionality
- [ ] Unit tests

### 🔗 Dependencies
- All previous phases

### ⏱️ Estimated Time
- 2 days

---

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐          │
│  │  users   │────<│ vendors  │     │categories│────<│categories│          │
│  └──────────┘     └──────────┘     └──────────┘     └──────────┘          │
│       │                │                │                                   │
│       │                │                │                                   │
│       ▼                ▼                ▼                                   │
│  ┌──────────┐     ┌──────────┐                                             │
│  │addresses │     │ products │─────────────────────────────┐               │
│  └──────────┘     └──────────┘                             │               │
│       │                │                                    │               │
│       │          ┌─────┴─────┬─────────────┐               │               │
│       │          ▼           ▼             ▼               │               │
│       │     ┌──────────┐ ┌──────────┐ ┌──────────┐         │               │
│       │     │  images  │ │sell_units│ │inventory │         │               │
│       │     └──────────┘ └──────────┘ └──────────┘         │               │
│       │                       │                             │               │
│       │                       │                             │               │
│       ▼                       ▼                             ▼               │
│  ┌──────────┐           ┌──────────┐                 ┌──────────┐          │
│  │  orders  │◀──────────│cart_items│                 │ reviews  │          │
│  └──────────┘           └──────────┘                 └──────────┘          │
│       │                                                                     │
│  ┌────┴────┬───────────────┐                                               │
│  ▼         ▼               ▼                                               │
│ ┌────────┐ ┌────────────┐ ┌────────────┐                                   │
│ │ items  │ │  payments  │ │  returns   │                                   │
│ └────────┘ └────────────┘ └────────────┘                                   │
│                 │               │                                           │
│                 ▼               ▼                                           │
│            ┌────────────┐ ┌────────────┐                                   │
│            │  refunds   │ │  payouts   │                                   │
│            └────────────┘ └────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Summary

| Phase | Module | Endpoints Count |
|-------|--------|-----------------|
| 1 | Auth | 7 |
| 2 | Vendor & Category | 15 |
| 3 | Product & Inventory | 15 |
| 4 | Cart & Orders | 18 |
| 5 | Payments | 5 |
| 6 | Reviews, Wishlist, Notifications | 12 |
| 7 | Coupons | 7 |
| 8 | Returns & Payouts | 12 |
| 9 | Search & Analytics | 8 |
| 10 | Admin & Audit | 6 |
| **Total** | | **~105 endpoints** |

---

## Project Structure

```
banda_ecommerce/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Settings & env vars
│   ├── database.py             # DB connection
│   │
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── vendor.py
│   │   ├── category.py
│   │   ├── product.py
│   │   ├── inventory.py
│   │   ├── cart.py
│   │   ├── order.py
│   │   ├── payment.py
│   │   ├── review.py
│   │   ├── coupon.py
│   │   └── ...
│   │
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── vendor.py
│   │   └── ...
│   │
│   ├── api/                    # Route handlers
│   │   ├── __init__.py
│   │   ├── deps.py             # Dependencies
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py       # Main router
│   │       ├── auth.py
│   │       ├── vendor.py
│   │       ├── category.py
│   │       ├── product.py
│   │       ├── cart.py
│   │       ├── order.py
│   │       ├── payment.py
│   │       └── ...
│   │
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── vendor_service.py
│   │   ├── product_service.py
│   │   ├── order_service.py
│   │   ├── payment_service.py
│   │   └── ...
│   │
│   ├── utils/                  # Utilities
│   │   ├── __init__.py
│   │   ├── security.py         # JWT, hashing
│   │   ├── geo.py              # Distance calc
│   │   ├── storage.py          # S3/Cloudinary
│   │   └── ...
│   │
│   └── middleware/             # Custom middleware
│       ├── __init__.py
│       └── audit.py
│
├── alembic/                    # Migrations
│   ├── versions/
│   └── env.py
│
├── tests/                      # Tests
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   └── ...
│
├── scripts/                    # Utility scripts
│   └── seed_data.py
│
├── .env.example
├── .gitignore
├── alembic.ini
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Timeline Summary

| Phase | Description | Duration | Cumulative |
|-------|-------------|----------|------------|
| 1 | Foundation & Auth | 2-3 days | 3 days |
| 2 | Vendor & Category | 2-3 days | 6 days |
| 3 | Product & Inventory | 3-4 days | 10 days |
| 4 | Cart & Orders | 4-5 days | 15 days |
| 5 | Payments | 2-3 days | 18 days |
| 6 | Reviews, Wishlist, Notifications | 2-3 days | 21 days |
| 7 | Coupons | 2 days | 23 days |
| 8 | Returns & Payouts | 3-4 days | 27 days |
| 9 | Search & Analytics | 2-3 days | 30 days |
| 10 | Admin & Audit | 2 days | 32 days |

**Total Estimated Time: ~4-5 weeks**

---

## Next Steps

1. ✅ Review this roadmap
2. ⏳ Start Phase 1: Foundation & Authentication
3. ⏳ Set up development environment
4. ⏳ Create initial database schema

---

> **Ready to start Phase 1?** Let me know and we'll begin with project setup and authentication! 🚀

Phase 1: Core order flow
Vendor acceptance with 15-min timeout
Status progression: PLACED → CONFIRMED → PICKED → PACKED
Phase 2: Delivery partner basics
Delivery partner login
View assigned orders
Mark as delivered
Phase 3: Assignment system
Admin assigns orders to delivery partners
Delivery partner accepts/rejects
Phase 4: Enhanced features
COD collection
Failed delivery handling
Delivery history
Should I proceed with implementation? Which phase should we start with?