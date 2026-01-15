# 📱 React Native Mobile App Roadmap
## Buyer/End-User Application

> **Quick-Commerce Mobile App (iOS & Android)**  
> Native mobile application for buyers to browse, shop, and track orders on the Banda E-Commerce platform.

---

## 📋 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Phase 1: Foundation & Authentication](#phase-1-foundation--authentication)
4. [Phase 2: Home & Categories](#phase-2-home--categories)
5. [Phase 3: Product Catalog & Search](#phase-3-product-catalog--search)
6. [Phase 4: Cart & Checkout](#phase-4-cart--checkout)
7. [Phase 5: Orders & Tracking](#phase-5-orders--tracking)
8. [Phase 6: Payment Integration](#phase-6-payment-integration)
9. [Phase 7: Enhanced Features](#phase-7-enhanced-features)
10. [Phase 8: Polish & Optimization](#phase-8-polish--optimization)
11. [Timeline Summary](#timeline-summary)

---

## 📦 Tech Stack

| Category | Technology | Why |
|----------|------------|-----|
| **Framework** | React Native (Expo) | Fast development, OTA updates, easy deployment |
| **Language** | TypeScript | Type safety, better DX, code reuse from web |
| **Navigation** | React Navigation v6 | Industry standard, deep linking, gestures |
| **State Management** | Redux Toolkit + RTK Query | Reuse API logic from web, powerful caching |
| **Styling** | NativeWind (Tailwind for RN) | Familiar utility-first, consistent with web |
| **Forms** | React Hook Form | Lightweight, performant, validation |
| **Validation** | Zod | TypeScript-first, schema validation |
| **Image Handling** | React Native Fast Image | Performance, caching, progressive loading |
| **Icons** | React Native Vector Icons | Comprehensive icon library |
| **Storage** | AsyncStorage | Token persistence, offline data |
| **HTTP Client** | RTK Query (built-in) | Auto-caching, refetching, optimistic updates |
| **Animations** | Reanimated 3 | 60fps animations, gesture handling |
| **Maps** | React Native Maps | Location picker, delivery tracking |
| **Payment** | Razorpay React Native SDK | Native payment integration |
| **Notifications** | Expo Notifications | Local & push notifications (future) |
| **Error Tracking** | Sentry | Production error monitoring |
| **Analytics** | Firebase Analytics | User behavior tracking |

---

## 🗂️ Project Structure

```
mobile/
├── app.json                    # Expo config
├── package.json
├── tsconfig.json
├── .env
├── src/
│   ├── app/                    # Navigation structure
│   │   ├── (auth)/             # Auth stack
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── _layout.tsx
│   │   ├── (tabs)/             # Main tabs
│   │   │   ├── (home)/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── category/[slug].tsx
│   │   │   │   └── _layout.tsx
│   │   │   ├── (search)/
│   │   │   │   ├── index.tsx
│   │   │   │   └── _layout.tsx
│   │   │   ├── (cart)/
│   │   │   │   ├── index.tsx
│   │   │   │   └── _layout.tsx
│   │   │   ├── (orders)/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── [id].tsx
│   │   │   │   └── _layout.tsx
│   │   │   ├── (profile)/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── addresses.tsx
│   │   │   │   └── _layout.tsx
│   │   │   └── _layout.tsx
│   │   ├── product/
│   │   │   └── [slug].tsx
│   │   ├── vendor/
│   │   │   └── [id].tsx
│   │   ├── checkout/
│   │   │   ├── index.tsx
│   │   │   ├── address.tsx
│   │   │   └── payment.tsx
│   │   └── _layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                 # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── TabBar.tsx
│   │   │   └── SafeArea.tsx
│   │   ├── product/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── ImageGallery.tsx
│   │   │   ├── SellUnitSelector.tsx
│   │   │   └── ...
│   │   ├── cart/
│   │   │   ├── CartItem.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   └── EmptyCart.tsx
│   │   ├── order/
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   ├── OrderTimeline.tsx
│   │   │   └── ...
│   │   ├── category/
│   │   │   ├── CategoryCard.tsx
│   │   │   └── CategoryGrid.tsx
│   │   └── address/
│   │       ├── AddressCard.tsx
│   │       └── AddressForm.tsx
│   │
│   ├── store/
│   │   ├── index.ts            # Redux store config
│   │   ├── hooks.ts            # Typed hooks
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── cartSlice.ts
│   │   │   └── locationSlice.ts
│   │   └── api/                # RTK Query APIs
│   │       ├── authApi.ts      # Reuse from web
│   │       ├── productApi.ts   # Reuse from web
│   │       ├── cartApi.ts      # Reuse from web
│   │       ├── orderApi.ts     # Reuse from web
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── constants.ts        # App constants
│   │   ├── utils.ts            # Helper functions
│   │   ├── storage.ts          # AsyncStorage wrapper
│   │   └── validation.ts       # Zod schemas
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   ├── useLocation.ts
│   │   └── ...
│   │
│   ├── types/                  # TypeScript types (reuse from web)
│   │   ├── user.ts
│   │   ├── product.ts
│   │   ├── order.ts
│   │   └── ...
│   │
│   └── services/
│       ├── payment.ts          # Razorpay integration
│       ├── location.ts         # Location services
│       └── notifications.ts    # Notification handling
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
└── __tests__/                  # Unit tests
```

---

## 🚀 Phase 1: Foundation & Authentication

### 🎯 Goal
Set up React Native project, navigation, Redux store, and complete authentication flow.

### 📱 Screens to Build

```
Auth Stack
├── Login Screen
│   ├── Email/Phone input
│   ├── Password input
│   ├── "Forgot Password?" link
│   ├── Login button
│   └── "Sign Up" navigation
│
├── Register Screen
│   ├── Name input
│   ├── Email input
│   ├── Phone input
│   ├── Password input
│   ├── Confirm password
│   ├── Terms acceptance checkbox
│   └── Register button
│
└── Onboarding Screen (Optional)
    ├── Welcome slides
    └── "Get Started" button
```

### 🎨 Components to Build

```
Base UI Components
├── Button (Primary, Secondary, Outline, Ghost)
├── Input (Text, Password, Phone, Search)
├── Card
├── Avatar
├── Spinner/Loading
├── ErrorMessage
└── SafeAreaWrapper
```

### 📋 Tasks

```
Phase 1 Tasks
├── 1.1 Project Setup
│   ├── Initialize Expo project with TypeScript
│   ├── Configure NativeWind (Tailwind)
│   ├── Setup folder structure
│   ├── Configure path aliases (@/)
│   ├── Add ESLint & Prettier
│   └── Setup environment variables
│
├── 1.2 Navigation Setup
│   ├── Install React Navigation
│   ├── Configure Auth Stack
│   ├── Configure Main Tabs
│   ├── Setup deep linking
│   ├── Add navigation types
│   └── Create navigation guards
│
├── 1.3 Redux Store Setup
│   ├── Install Redux Toolkit
│   ├── Configure store with middleware
│   ├── Setup RTK Query base query
│   ├── Add token refresh logic
│   ├── Configure AsyncStorage persistence
│   └── Create typed hooks
│
├── 1.4 API Integration
│   ├── Port authApi.ts from web (RTK Query)
│   ├── Setup base query with interceptors
│   ├── Handle 401 errors (auto logout)
│   ├── Add request/response logging
│   └── Configure error handling
│
├── 1.5 Design System
│   ├── Define color palette (match web)
│   ├── Typography scale
│   ├── Spacing tokens
│   ├── Create base UI components
│   └── Setup theme provider
│
├── 1.6 Auth Screens
│   ├── Build Login screen with validation
│   ├── Build Register screen
│   ├── Add form validation (Zod)
│   ├── Implement auth state persistence
│   ├── Add loading states
│   └── Handle error messages
│
└── 1.7 Profile Screen (Basic)
    ├── User info display
    ├── Logout button
    └── Navigation to settings
```

### 🔌 API Endpoints Used

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
PUT  /api/v1/auth/me
```

### ⏱️ Estimated Time
**1.5 weeks**

### ✅ Deliverables
- [ ] Expo project setup
- [ ] Navigation structure
- [ ] Redux store with RTK Query
- [ ] Auth API integration
- [ ] Login & Register screens
- [ ] Token persistence
- [ ] Protected routes
- [ ] Basic profile screen

---

## 🚀 Phase 2: Home & Categories

### 🎯 Goal
Build home screen with location picker, category grid, and category browsing.

### 📱 Screens to Build

```
Home Tab
├── Home Screen
│   ├── Location picker header
│   ├── Search bar (navigates to search)
│   ├── Banner carousel
│   ├── Category grid (6-8 main categories)
│   ├── "Shop by Category" section
│   └── Featured products (optional)
│
└── Category Detail Screen
    ├── Category breadcrumb
    ├── Subcategory list (if any)
    ├── Product grid (filtered by category)
    └── Filters button
```

### 🎨 Components to Build

```
Home Components
├── LocationPicker
│   ├── Current location display
│   ├── Change location modal
│   └── Location search
│
├── SearchBar
│   ├── Search input
│   └── Navigate to search screen
│
├── BannerCarousel
│   ├── Image carousel
│   └── Auto-scroll
│
├── CategoryGrid
│   └── Category cards (with images)
│
└── CategoryCard
    ├── Category image
    ├── Category name
    └── Tap to navigate
```

### 📋 Tasks

```
Phase 2 Tasks
├── 2.1 Location Management
│   ├── Get user location (permissions)
│   ├── Store location in Redux
│   ├── Location picker component
│   ├── Location search functionality
│   └── Persist location preference
│
├── 2.2 Home Screen
│   ├── Build home layout
│   ├── Integrate location picker
│   ├── Add search bar
│   ├── Build banner carousel
│   ├── Create category grid
│   └── Add pull-to-refresh
│
├── 2.3 Category API Integration
│   ├── Port categoryApi.ts from web
│   ├── Fetch categories tree
│   ├── Handle category images
│   └── Cache category data
│
├── 2.4 Category Detail Screen
│   ├── Build category detail layout
│   ├── Display subcategories
│   ├── Show products in category
│   ├── Add filters button (UI only)
│   └── Handle empty states
│
└── 2.5 Navigation
    ├── Setup tab navigation
    ├── Add home tab
    ├── Configure category deep links
    └── Add back navigation
```

### 🔌 API Endpoints Used

```
GET /api/v1/categories
GET /api/v1/categories/tree
GET /api/v1/categories/{slug}
GET /api/v1/products?category_id={id}
```

### ⏱️ Estimated Time
**1 week**

### ✅ Deliverables
- [ ] Location picker & management
- [ ] Home screen with all sections
- [ ] Category grid with images
- [ ] Category detail screen
- [ ] Category API integration
- [ ] Tab navigation setup

---

## 🚀 Phase 3: Product Catalog & Search

### 🎯 Goal
Implement product listing, product detail page, search functionality, and vendor store view.

### 📱 Screens to Build

```
Product Screens
├── Product Listing Screen
│   ├── Filter button (opens modal)
│   ├── Sort dropdown
│   ├── Product grid/list toggle
│   ├── Infinite scroll
│   └── Loading skeletons
│
├── Product Detail Screen
│   ├── Image gallery (swipeable)
│   ├── Product name & vendor
│   ├── Price display
│   ├── Sell unit selector
│   ├── Quantity selector
│   ├── Add to cart button
│   ├── Product description
│   ├── Related products
│   └── "View Store" button
│
├── Search Screen
│   ├── Search input with focus
│   ├── Recent searches
│   ├── Search suggestions
│   ├── Search results
│   └── Filters
│
└── Vendor Store Screen
    ├── Vendor info card
    ├── Store stats
    ├── Product grid
    └── Follow/Share (optional)
```

### 🎨 Components to Build

```
Product Components
├── ProductCard
│   ├── Product image
│   ├── Product name
│   ├── Price with discount
│   ├── Stock badge
│   └── Add to cart quick action
│
├── ProductList
│   ├── Grid view
│   ├── List view
│   └── View toggle
│
├── ProductDetail
│   ├── Image gallery with zoom
│   ├── Product info section
│   ├── Sell unit picker
│   ├── Quantity controls
│   └── Add to cart CTA
│
├── ImageGallery
│   ├── Swipeable images
│   ├── Image indicators
│   └── Full-screen view
│
├── SellUnitSelector
│   ├── Unit options (500g, 1kg, etc.)
│   ├── Price per unit
│   └── Selection state
│
├── FilterModal
│   ├── Category filter
│   ├── Price range slider
│   ├── In-stock toggle
│   ├── Sort options
│   └── Apply/Clear buttons
│
└── SearchBar
    ├── Search input
    ├── Auto-complete suggestions
    └── Recent searches
```

### 📋 Tasks

```
Phase 3 Tasks
├── 3.1 Product API Integration
│   ├── Port productApi.ts from web
│   ├── Setup product queries
│   ├── Implement infinite scroll
│   ├── Add product caching
│   └── Handle loading/error states
│
├── 3.2 Product Listing
│   ├── Build product grid
│   ├── Add list/grid toggle
│   ├── Implement infinite scroll
│   ├── Add loading skeletons
│   ├── Handle empty states
│   └── Add pull-to-refresh
│
├── 3.3 Filters & Search
│   ├── Build filter modal
│   ├── Implement category filter
│   ├── Add price range slider
│   ├── Add sort functionality
│   ├── Build search screen
│   ├── Implement search with debounce
│   ├── Add search suggestions
│   └── Store recent searches
│
├── 3.4 Product Detail
│   ├── Build product detail layout
│   ├── Create image gallery
│   ├── Add sell unit selector
│   ├── Implement quantity controls
│   ├── Add "Add to Cart" functionality
│   ├── Display product description
│   ├── Show related products
│   └── Add "View Store" navigation
│
├── 3.5 Vendor Store
│   ├── Build vendor store screen
│   ├── Display vendor info
│   ├── Show vendor products
│   └── Add vendor stats
│
└── 3.6 Image Optimization
    ├── Setup Fast Image
    ├── Configure image caching
    ├── Add placeholder images
    └── Optimize image sizes
```

### 🔌 API Endpoints Used

```
GET /api/v1/products
GET /api/v1/products/search?q={query}
GET /api/v1/products/{slug}
GET /api/v1/products/{id}/sell-units
GET /api/v1/vendors/{vendor_id}/products
GET /api/v1/vendors/{vendor_id}/store/stats
```

### ⏱️ Estimated Time
**2 weeks**

### ✅ Deliverables
- [ ] Product listing with filters
- [ ] Product detail page
- [ ] Search functionality
- [ ] Vendor store view
- [ ] Image optimization
- [ ] Infinite scroll
- [ ] Filter modal

---

## 🚀 Phase 4: Cart & Checkout

### 🎯 Goal
Implement shopping cart, address management, and checkout flow.

### 📱 Screens to Build

```
Cart & Checkout
├── Cart Screen
│   ├── Cart items list
│   ├── Update quantity
│   ├── Remove item
│   ├── Cart summary
│   └── Proceed to checkout button
│
├── Checkout Screen
│   ├── Step 1: Address selection
│   ├── Step 2: Payment method
│   ├── Step 3: Order review
│   ├── Order summary
│   └── Place order button
│
├── Address Management
│   ├── Address list
│   ├── Add new address
│   ├── Edit address
│   ├── Delete address
│   └── Set default address
│
└── Address Form
    ├── Address inputs
    ├── Location picker (map)
    ├── Save address
    └── Validation
```

### 🎨 Components to Build

```
Cart Components
├── CartItem
│   ├── Product image
│   ├── Product name
│   ├── Sell unit
│   ├── Price
│   ├── Quantity controls
│   └── Remove button
│
├── CartSummary
│   ├── Subtotal
│   ├── Delivery fee
│   ├── Discount (if any)
│   └── Total
│
├── EmptyCart
│   └── "Continue Shopping" CTA
│
├── AddressCard
│   ├── Address details
│   ├── Default badge
│   └── Edit/Delete actions
│
├── AddressForm
│   ├── Form inputs
│   ├── Map picker
│   └── Save button
│
└── PaymentMethodSelector
    ├── COD option
    ├── Online payment option
    └── Selection state
```

### 📋 Tasks

```
Phase 4 Tasks
├── 4.1 Cart Management
│   ├── Port cartApi.ts from web
│   ├── Build cart screen
│   ├── Implement add to cart
│   ├── Update quantity
│   ├── Remove item
│   ├── Cart summary calculation
│   └── Persist cart state
│
├── 4.2 Address Management
│   ├── Port addressApi.ts from web
│   ├── Build address list screen
│   ├── Create address form
│   ├── Integrate map picker
│   ├── Add/edit/delete addresses
│   ├── Set default address
│   └── Validate addresses
│
├── 4.3 Checkout Flow
│   ├── Build checkout screen
│   ├── Multi-step flow
│   ├── Address selection step
│   ├── Payment method selection
│   ├── Order review step
│   ├── Order summary display
│   ├── Delivery fee calculation
│   └── Place order functionality
│
├── 4.4 Map Integration
│   ├── Setup React Native Maps
│   ├── Location picker component
│   ├── Get coordinates from map
│   ├── Reverse geocoding
│   └── Handle permissions
│
└── 4.5 Order Placement
    ├── Validate cart before checkout
    ├── Create order API call
    ├── Handle order creation errors
    ├── Navigate to order confirmation
    └── Clear cart on success
```

### 🔌 API Endpoints Used

```
GET  /api/v1/cart
POST /api/v1/cart/items
PUT  /api/v1/cart/items/{id}
DELETE /api/v1/cart/items/{id}
GET  /api/v1/cart/summary

GET  /api/v1/addresses
POST /api/v1/addresses
PUT  /api/v1/addresses/{id}
DELETE /api/v1/addresses/{id}
PUT  /api/v1/addresses/{id}/default

POST /api/v1/delivery/check
GET  /api/v1/delivery/fee

POST /api/v1/orders
```

### ⏱️ Estimated Time
**2 weeks**

### ✅ Deliverables
- [ ] Shopping cart functionality
- [ ] Address management
- [ ] Checkout flow
- [ ] Map integration for addresses
- [ ] Order placement
- [ ] Cart persistence

---

## 🚀 Phase 5: Orders & Tracking

### 🎯 Goal
Implement order history, order details, order tracking, and order management.

### 📱 Screens to Build

```
Orders
├── Orders List Screen
│   ├── Filter by status
│   ├── Order cards
│   ├── Pull to refresh
│   └── Empty state
│
├── Order Detail Screen
│   ├── Order info header
│   ├── Order items list
│   ├── Order status timeline
│   ├── Delivery address
│   ├── Payment info
│   ├── Cancel order button
│   └── Track order button
│
└── Order Tracking Screen
    ├── Order status timeline
    ├── Estimated delivery
    ├── Delivery partner info (if assigned)
    └── Map view (optional)
```

### 🎨 Components to Build

```
Order Components
├── OrderCard
│   ├── Order number
│   ├── Order date
│   ├── Order status badge
│   ├── Total amount
│   ├── Item count
│   └── Tap to view details
│
├── OrderDetail
│   ├── Order header
│   ├── Items list
│   ├── Summary section
│   └── Actions
│
├── OrderTimeline
│   ├── Status steps
│   ├── Current status highlight
│   └── Timestamps
│
├── OrderItem
│   ├── Product image
│   ├── Product name
│   ├── Quantity & unit
│   └── Price
│
└── StatusBadge
    ├── Status label
    └── Status color
```

### 📋 Tasks

```
Phase 5 Tasks
├── 5.1 Order API Integration
│   ├── Port orderApi.ts from web
│   ├── Fetch orders list
│   ├── Fetch order details
│   ├── Cancel order functionality
│   └── Track order
│
├── 5.2 Orders List
│   ├── Build orders list screen
│   ├── Create order card component
│   ├── Add status filter
│   ├── Implement pull-to-refresh
│   ├── Add infinite scroll
│   └── Handle empty states
│
├── 5.3 Order Detail
│   ├── Build order detail screen
│   ├── Display order items
│   ├── Show order summary
│   ├── Display delivery address
│   ├── Show payment info
│   ├── Add cancel order functionality
│   └── Add reorder functionality
│
├── 5.4 Order Tracking
│   ├── Build order timeline
│   ├── Display current status
│   ├── Show estimated delivery
│   ├── Add delivery partner info
│   └── Optional: Map integration
│
└── 5.5 Order Status Updates
    ├── Poll order status (optional)
    ├── Show status badges
    ├── Handle status changes
    └── Update UI on status change
```

### 🔌 API Endpoints Used

```
GET  /api/v1/orders
GET  /api/v1/orders/{id}
POST /api/v1/orders/{id}/cancel
GET  /api/v1/orders/track/{order_number}
```

### ⏱️ Estimated Time
**1 week**

### ✅ Deliverables
- [ ] Orders list screen
- [ ] Order detail screen
- [ ] Order tracking
- [ ] Cancel order functionality
- [ ] Reorder functionality
- [ ] Status badges & timeline

---

## 🚀 Phase 6: Payment Integration

### 🎯 Goal
Integrate Razorpay for online payments with native SDK.

### 📱 Screens to Build

```
Payment
├── Payment Screen (Modal)
│   ├── Order summary
│   ├── Payment amount
│   ├── Payment method selection
│   └── Pay button
│
└── Payment Success/Failure
    ├── Success screen
    ├── Failure screen
    └── Retry payment
```

### 🎨 Components to Build

```
Payment Components
├── PaymentModal
│   ├── Order summary
│   ├── Payment amount
│   └── Payment options
│
└── PaymentStatus
    ├── Success view
    └── Failure view
```

### 📋 Tasks

```
Phase 6 Tasks
├── 6.1 Razorpay Setup
│   ├── Install Razorpay React Native SDK
│   ├── Configure Razorpay keys
│   ├── Setup payment service
│   └── Handle payment callbacks
│
├── 6.2 Payment Flow
│   ├── Create payment order (backend)
│   ├── Initialize Razorpay checkout
│   ├── Handle payment success
│   ├── Handle payment failure
│   ├── Verify payment (backend)
│   └── Update order status
│
├── 6.3 Payment UI
│   ├── Build payment modal
│   ├── Show payment options
│   ├── Display order summary
│   ├── Build success screen
│   ├── Build failure screen
│   └── Add retry functionality
│
└── 6.4 Error Handling
    ├── Handle payment errors
    ├── Show error messages
    ├── Handle network failures
    └── Add retry logic
```

### 🔌 API Endpoints Used

```
POST /api/v1/payments/create-order
POST /api/v1/payments/verify
GET  /api/v1/payments/{order_id}
```

### ⏱️ Estimated Time
**1 week**

### ✅ Deliverables
- [ ] Razorpay integration
- [ ] Payment flow
- [ ] Payment success/failure screens
- [ ] Error handling
- [ ] Payment verification

---

## 🚀 Phase 7: Enhanced Features

### 🎯 Goal
Add reviews, wishlist, coupons, and returns functionality.

### 📱 Screens to Build

```
Enhanced Features
├── Reviews Screen
│   ├── Product reviews list
│   ├── Add review form
│   └── Review rating
│
├── Wishlist Screen
│   ├── Wishlist items grid
│   ├── Remove from wishlist
│   └── Add to cart from wishlist
│
├── Coupons Screen
│   ├── Available coupons
│   ├── Apply coupon input
│   └── Applied coupon display
│
└── Returns Screen
    ├── Return request form
    ├── Return reasons
    ├── Return status
    └── Return history
```

### 🎨 Components to Build

```
Enhanced Components
├── ReviewCard
├── ReviewForm
├── WishlistItem
├── CouponCard
├── ReturnForm
└── ReturnStatus
```

### 📋 Tasks

```
Phase 7 Tasks
├── 7.1 Reviews
│   ├── Port reviewApi.ts from web
│   ├── Display product reviews
│   ├── Add review functionality
│   ├── Edit/delete review
│   └── Show verified purchase badge
│
├── 7.2 Wishlist
│   ├── Port wishlistApi.ts from web
│   ├── Build wishlist screen
│   ├── Add to wishlist
│   ├── Remove from wishlist
│   └── Add to cart from wishlist
│
├── 7.3 Coupons
│   ├── Port couponApi.ts from web
│   ├── Validate coupon
│   ├── Apply coupon to cart
│   ├── Display applied coupon
│   └── Remove coupon
│
└── 7.4 Returns
    ├── Port returnApi.ts from web
    ├── Build return request form
    ├── Submit return request
    ├── View return status
    └── Return history
```

### 🔌 API Endpoints Used

```
GET    /api/v1/products/{id}/reviews
POST   /api/v1/products/{id}/reviews
PUT    /api/v1/reviews/{id}
DELETE /api/v1/reviews/{id}

GET    /api/v1/wishlist
POST   /api/v1/wishlist/{product_id}
DELETE /api/v1/wishlist/{product_id}

POST   /api/v1/coupons/validate
POST   /api/v1/coupons/apply

POST   /api/v1/orders/{id}/return
GET    /api/v1/returns
GET    /api/v1/returns/{id}
```

### ⏱️ Estimated Time
**1.5 weeks**

### ✅ Deliverables
- [ ] Reviews functionality
- [ ] Wishlist
- [ ] Coupon system
- [ ] Returns & refunds

---

## 🚀 Phase 8: Polish & Optimization

### 🎯 Goal
Optimize performance, add animations, improve UX, and prepare for production.

### 📋 Tasks

```
Phase 8 Tasks
├── 8.1 Performance Optimization
│   ├── Optimize image loading
│   ├── Implement code splitting
│   ├── Add lazy loading
│   ├── Optimize list rendering
│   ├── Add memoization
│   └── Reduce bundle size
│
├── 8.2 Animations
│   ├── Add screen transitions
│   ├── Add loading animations
│   ├── Add micro-interactions
│   ├── Add pull-to-refresh animations
│   └── Add cart animations
│
├── 8.3 UX Improvements
│   ├── Add skeleton loaders
│   ├── Improve error messages
│   ├── Add empty states
│   ├── Add offline handling
│   ├── Add retry mechanisms
│   └── Improve form validation
│
├── 8.4 Error Handling
│   ├── Global error boundary
│   ├── API error handling
│   ├── Network error handling
│   ├── Payment error handling
│   └── User-friendly error messages
│
├── 8.5 Testing
│   ├── Unit tests for utilities
│   ├── Component tests
│   ├── Integration tests
│   └── E2E tests (optional)
│
├── 8.6 Production Setup
│   ├── Setup Sentry
│   ├── Setup Firebase Analytics
│   ├── Configure app icons & splash
│   ├── Setup app store assets
│   ├── Configure build settings
│   └── Setup CI/CD
│
└── 8.7 App Store Preparation
    ├── iOS App Store setup
    ├── Google Play setup
    ├── App store listings
    ├── Screenshots & videos
    └── Privacy policy & terms
```

### ⏱️ Estimated Time
**2 weeks**

### ✅ Deliverables
- [ ] Performance optimizations
- [ ] Smooth animations
- [ ] Improved UX
- [ ] Error handling
- [ ] Production-ready build
- [ ] App store assets

---

## 📅 Timeline Summary

| Phase | Description | Duration | Cumulative |
|-------|-------------|----------|------------|
| **Phase 1** | Foundation & Auth | 1.5 weeks | 1.5 weeks |
| **Phase 2** | Home & Categories | 1 week | 2.5 weeks |
| **Phase 3** | Product Catalog & Search | 2 weeks | 4.5 weeks |
| **Phase 4** | Cart & Checkout | 2 weeks | 6.5 weeks |
| **Phase 5** | Orders & Tracking | 1 week | 7.5 weeks |
| **Phase 6** | Payment Integration | 1 week | 8.5 weeks |
| **Phase 7** | Enhanced Features | 1.5 weeks | 10 weeks |
| **Phase 8** | Polish & Optimization | 2 weeks | 12 weeks |

**Total Estimated Time: ~12 weeks (3 months)**

---

## 🎯 MVP Scope (Faster Launch)

For a faster MVP launch, focus on:

1. **Phase 1**: Foundation & Auth ✅
2. **Phase 2**: Home & Categories ✅
3. **Phase 3**: Product Catalog (basic) ✅
4. **Phase 4**: Cart & Checkout ✅
5. **Phase 5**: Orders (basic) ✅
6. **Phase 6**: Payment (COD + Online) ✅

**MVP Timeline: ~8 weeks**

Skip for MVP:
- Advanced search
- Reviews
- Wishlist
- Coupons
- Returns
- Advanced animations

---

## 🔄 Code Reuse Strategy

### What Can Be Reused from Web App

1. **TypeScript Types** (~95% reusable)
   - Copy `frontend/src/types/*` to `mobile/src/types/`
   - Minor adjustments for React Native

2. **RTK Query API Slices** (~80% reusable)
   - Copy `frontend/src/store/api/*.ts`
   - Update `baseQuery` to use React Native fetch
   - Same endpoints, same data structures

3. **Business Logic** (~70% reusable)
   - Validation schemas (Zod)
   - Utility functions
   - Constants

4. **Redux Slices** (~60% reusable)
   - Auth slice logic
   - Cart slice logic
   - Minor adjustments for mobile

### What Needs to Be Rebuilt

1. **All UI Components** (100% new)
   - React Native components
   - Different styling approach
   - Mobile-specific interactions

2. **Navigation** (100% new)
   - React Navigation instead of Next.js routing
   - Different navigation patterns

3. **Forms** (80% new)
   - React Native form components
   - Different validation UI

4. **Image Handling** (100% new)
   - React Native Image/Fast Image
   - Different caching strategy

---

## 🚀 Getting Started

```bash
# Create Expo project
npx create-expo-app@latest mobile --template

# Install dependencies
cd mobile
npm install @reduxjs/toolkit react-redux
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install nativewind tailwindcss
npm install react-native-fast-image
npm install @react-native-async-storage/async-storage
npm install react-hook-form zod @hookform/resolvers
npm install react-native-razorpay-checkout
npm install react-native-maps

# Start development
npm start
```

---

## 📋 Phase 1 Checklist (Start Here)

- [ ] Create Expo project with TypeScript
- [ ] Configure NativeWind (Tailwind)
- [ ] Setup folder structure
- [ ] Install React Navigation
- [ ] Setup Redux Toolkit store
- [ ] Port authApi.ts from web
- [ ] Configure AsyncStorage persistence
- [ ] Build base UI components
- [ ] Create Login screen
- [ ] Create Register screen
- [ ] Add protected routes
- [ ] Test auth flow end-to-end

---

## 🎨 Design Guidelines

### Color Palette (Match Web)

```typescript
const colors = {
  primary: '#7B2D8E',
  primaryDark: '#5A1F68',
  primaryLight: '#9B4DAE',
  secondary: '#FF6B35',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray500: '#6B7280',
  gray900: '#111827',
};
```

### Typography

```typescript
const typography = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};
```

### Spacing

```typescript
const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
};
```

---

## 🔑 Key Considerations

### Platform Differences

1. **iOS vs Android**
   - Different navigation patterns
   - Platform-specific UI components
   - Different permission handling

2. **Performance**
   - Optimize image loading
   - Use FlatList for long lists
   - Memoize expensive computations

3. **Offline Support**
   - Cache API responses
   - Store cart locally
   - Show offline indicators

4. **Deep Linking**
   - Product deep links
   - Order deep links
   - Category deep links

5. **App Store Requirements**
   - Privacy policy
   - Terms of service
   - App store guidelines compliance

---

## 📊 Success Metrics

- **User Engagement**
  - Daily active users
  - Session duration
  - Screen views per session

- **Business Metrics**
  - Orders placed
  - Cart abandonment rate
  - Payment success rate
  - Average order value

- **Technical Metrics**
  - App crash rate
  - API response time
  - Image load time
  - App size

---

Ready to start **Phase 1**? Let's build! 🚀

