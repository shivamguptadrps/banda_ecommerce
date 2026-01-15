# 🎨 Frontend Implementation Roadmap

## Quick-Commerce UI (Zepto/Blinkit Inspired)

---

## 📦 Tech Stack (Beginner-Friendly)

| Category | Technology | Why |
|----------|------------|-----|
| **Framework** | Next.js 14 (App Router) | SSR, SEO, Image optimization |
| **Language** | TypeScript | Type safety, better DX |
| **Styling** | Tailwind CSS | Fast, utility-first |
| **State** | Redux Toolkit | Familiar, powerful DevTools |
| **API Calls** | Axios + RTK Query | Caching, auto-refetch |
| **Forms** | React Hook Form | Lightweight, performant |
| **Validation** | Zod | TypeScript-first validation |
| **Animations** | Framer Motion | Easy, powerful |
| **Icons** | Lucide React | Beautiful, tree-shakeable |
| **Toast/Alerts** | React Hot Toast | Simple, customizable |
| **Modals** | Headless UI | Accessible, unstyled |
| **Date Picker** | React Day Picker | Lightweight |
| **Maps** | Leaflet (free) | For delivery tracking |

---

## 🗂️ Project Structure

```
frontend/
├── public/
│   ├── images/
│   └── icons/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth group routes
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   ├── (buyer)/            # Buyer routes
│   │   │   ├── page.tsx        # Home
│   │   │   ├── category/
│   │   │   ├── product/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── orders/
│   │   │   ├── profile/
│   │   │   └── layout.tsx
│   │   ├── (vendor)/           # Vendor dashboard
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── settings/
│   │   │   └── layout.tsx
│   │   ├── (admin)/            # Admin panel
│   │   │   ├── dashboard/
│   │   │   ├── vendors/
│   │   │   ├── categories/
│   │   │   ├── orders/
│   │   │   └── layout.tsx
│   │   ├── layout.tsx          # Root layout
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── ...
│   │   ├── layout/             # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── ...
│   │   ├── auth/               # Auth components
│   │   ├── product/            # Product components
│   │   ├── cart/               # Cart components
│   │   ├── order/              # Order components
│   │   └── vendor/             # Vendor components
│   ├── store/                  # Redux store
│   │   ├── index.ts
│   │   ├── hooks.ts
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── cartSlice.ts
│   │   │   └── ...
│   │   └── api/                # RTK Query APIs
│   │       ├── authApi.ts
│   │       ├── productApi.ts
│   │       ├── cartApi.ts
│   │       └── ...
│   ├── lib/                    # Utilities
│   │   ├── axios.ts            # Axios instance
│   │   ├── utils.ts            # Helper functions
│   │   └── constants.ts
│   ├── hooks/                  # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   └── ...
│   ├── types/                  # TypeScript types
│   │   ├── user.ts
│   │   ├── product.ts
│   │   ├── order.ts
│   │   └── ...
│   └── styles/
│       └── globals.css
├── .env.local
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🚀 Phase-Wise Implementation

### Overview

| Phase | Backend Module | Frontend Module | Key Screens |
|-------|---------------|-----------------|-------------|
| **1** | Foundation & Auth | Auth & Layout | Login, Register, Profile |
| **2** | Vendor & Category | Categories & Vendor Dashboard | Home, Categories, Vendor Onboarding |
| **3** | Product & Inventory | Product Catalog | Product List, Product Detail, Search |
| **4** | Cart & Orders | Shopping Flow | Cart, Checkout, Orders, Tracking |

---

## 📱 Phase 1: Foundation & Auth UI

### Goals
- Project setup with Next.js 14
- Tailwind CSS configuration
- Redux store setup
- Auth flows (Login, Register, Logout)
- Protected routes
- User profile

### Screens to Build

```
📱 Auth Screens
├── /login              → Login form (email/phone + password)
├── /register           → Registration (buyer/vendor toggle)
├── /forgot-password    → Password reset (optional)
└── /profile            → User profile & settings

🎨 Components
├── ui/Button           → Primary, Secondary, Ghost variants
├── ui/Input            → Text, Password, Phone inputs
├── ui/Card             → Container component
├── ui/Avatar           → User avatar
├── ui/Spinner          → Loading spinner
├── layout/Header       → Top navigation (basic)
├── layout/MobileNav    → Bottom navigation (mobile)
└── auth/AuthGuard      → Protected route wrapper
```

### Tasks

```
Phase 1 Tasks
├── 1.1 Project Setup
│   ├── Initialize Next.js 14 with TypeScript
│   ├── Configure Tailwind CSS
│   ├── Setup folder structure
│   ├── Configure path aliases (@/)
│   └── Add ESLint & Prettier
│
├── 1.2 Design System
│   ├── Define color palette (Zepto-inspired)
│   ├── Typography scale
│   ├── Spacing & sizing tokens
│   ├── Create base UI components
│   └── Dark mode support (optional)
│
├── 1.3 Redux Setup
│   ├── Configure Redux Toolkit store
│   ├── Setup RTK Query for API
│   ├── Create auth slice
│   ├── Persist auth state (localStorage)
│   └── Create typed hooks
│
├── 1.4 API Integration
│   ├── Setup Axios instance with interceptors
│   ├── Token refresh logic
│   ├── Error handling
│   └── Create auth API endpoints
│
├── 1.5 Auth Screens
│   ├── Login page with form validation
│   ├── Register page (buyer/vendor)
│   ├── Profile page
│   ├── Protected route middleware
│   └── Logout functionality
│
└── 1.6 Layout
    ├── Root layout with providers
    ├── Auth layout (centered card)
    ├── Main layout (header + content)
    └── Loading & error states
```

### API Endpoints Used
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
PUT  /api/v1/auth/me
```

---

## 📱 Phase 2: Categories & Vendor Dashboard

### Goals
- Home page with category grid
- Category browsing
- Vendor registration flow
- Vendor dashboard (basic)
- Admin category management

### Screens to Build

```
📱 Buyer Screens
├── /                   → Home (location, search, categories, banners)
├── /category           → All categories grid
└── /category/[slug]    → Category page with products

👨‍💼 Vendor Screens
├── /vendor/register    → Vendor onboarding form
├── /vendor/dashboard   → Vendor dashboard home
├── /vendor/profile     → Shop profile settings
└── /vendor/pending     → Waiting for approval

👑 Admin Screens
├── /admin/dashboard    → Admin overview
├── /admin/categories   → Category management (CRUD)
├── /admin/vendors      → Vendor approval list
└── /admin/vendors/[id] → Vendor detail & approve/reject

🎨 New Components
├── home/LocationPicker      → City/area selector
├── home/SearchBar           → Product search
├── home/CategoryGrid        → Category cards
├── home/Banner              → Promotional banners
├── category/CategoryCard    → Single category card
├── category/Breadcrumb      → Navigation breadcrumb
├── vendor/VendorForm        → Registration form
├── vendor/VendorSidebar     → Dashboard sidebar
├── admin/DataTable          → Sortable data table
└── admin/AdminSidebar       → Admin navigation
```

### Tasks

```
Phase 2 Tasks
├── 2.1 Home Page
│   ├── Hero section with location
│   ├── Search bar (UI only, functional in Phase 3)
│   ├── Category grid (6-8 main categories)
│   ├── Banner carousel
│   └── "Shop by Category" section
│
├── 2.2 Category Pages
│   ├── Category listing page
│   ├── Category detail page
│   ├── Subcategory navigation
│   ├── Breadcrumb component
│   └── Empty state handling
│
├── 2.3 Vendor Onboarding
│   ├── Multi-step registration form
│   ├── Shop details form
│   ├── Address with map picker
│   ├── Document upload (logo)
│   ├── Terms acceptance
│   └── Pending approval screen
│
├── 2.4 Vendor Dashboard
│   ├── Dashboard layout with sidebar
│   ├── Overview cards (orders, revenue)
│   ├── Quick stats
│   └── Profile settings
│
├── 2.5 Admin Panel
│   ├── Admin layout with sidebar
│   ├── Category CRUD interface
│   ├── Category tree view
│   ├── Vendor list with filters
│   ├── Vendor approval actions
│   └── Service zone management
│
└── 2.6 Responsive Design
    ├── Mobile-first approach
    ├── Bottom navigation for mobile
    ├── Collapsible sidebars
    └── Touch-friendly interactions
```

### API Endpoints Used
```
# Categories
GET  /api/v1/categories
GET  /api/v1/categories/tree
GET  /api/v1/categories/{slug}

# Vendor
POST /api/v1/vendor/register
GET  /api/v1/vendor/profile
PUT  /api/v1/vendor/profile
GET  /api/v1/vendors (public)

# Admin
POST /api/v1/admin/categories
PUT  /api/v1/admin/categories/{id}
GET  /api/v1/admin/vendors
POST /api/v1/admin/vendors/{id}/approve
POST /api/v1/admin/service-zones
```

---

## 📱 Phase 3: Product Catalog

### Goals
- Product listing with filters
- Product detail page
- Search functionality
- Vendor product management
- Inventory management

### Screens to Build

```
📱 Buyer Screens
├── /products               → All products with filters
├── /products/search        → Search results
├── /product/[slug]         → Product detail page
└── /vendor/[id]            → Vendor store page

👨‍💼 Vendor Screens
├── /vendor/products        → Product list
├── /vendor/products/new    → Add new product
├── /vendor/products/[id]   → Edit product
└── /vendor/inventory       → Stock management

🎨 New Components
├── product/ProductCard          → Product grid card
├── product/ProductList          → List view
├── product/ProductDetail        → Full product view
├── product/ProductGallery       → Image gallery
├── product/SellUnitSelector     → Unit/variant picker
├── product/PriceDisplay         → Price with discount
├── product/StockBadge           → In stock/Out of stock
├── product/AddToCartButton      → Add to cart CTA
├── filter/FilterSidebar         → Desktop filters
├── filter/FilterSheet           → Mobile filter modal
├── filter/PriceRangeSlider      → Price filter
├── filter/SortDropdown          → Sort options
├── search/SearchModal           → Full-screen search
├── search/SearchSuggestions     → Auto-complete
├── vendor/ProductForm           → Add/Edit product form
├── vendor/ImageUpload           → Multi-image upload
├── vendor/SellUnitManager       → Manage sell units
└── vendor/InventoryTable        → Stock management
```

### Tasks

```
Phase 3 Tasks
├── 3.1 Product Listing
│   ├── Product grid with cards
│   ├── List/Grid view toggle
│   ├── Infinite scroll or pagination
│   ├── Loading skeletons
│   └── Empty state
│
├── 3.2 Filters & Search
│   ├── Category filter
│   ├── Price range filter
│   ├── In-stock filter
│   ├── Sort by (price, newest, popular)
│   ├── Mobile filter sheet
│   ├── Search with debounce
│   └── Search suggestions
│
├── 3.3 Product Detail
│   ├── Image gallery with zoom
│   ├── Product info section
│   ├── Sell unit selector (500g, 1kg, etc.)
│   ├── Price display with discounts
│   ├── Add to cart button
│   ├── Quantity selector
│   ├── Stock availability
│   ├── Vendor info card
│   └── Related products
│
├── 3.4 Vendor Product Management
│   ├── Product list with actions
│   ├── Add product form
│   │   ├── Basic info (name, description)
│   │   ├── Category selector
│   │   ├── Stock unit selection
│   │   ├── Image upload (multiple)
│   │   ├── Sell units configuration
│   │   └── Initial stock
│   ├── Edit product
│   ├── Delete/Deactivate product
│   └── Bulk actions (optional)
│
├── 3.5 Inventory Management
│   ├── Inventory table
│   ├── Stock adjustment (+/-)
│   ├── Low stock alerts
│   └── Stock history (optional)
│
└── 3.6 Performance
    ├── Image optimization (next/image)
    ├── Lazy loading
    ├── Skeleton loaders
    └── API response caching
```

### API Endpoints Used
```
# Products (Public)
GET  /api/v1/products
GET  /api/v1/products/search
GET  /api/v1/products/{slug}
GET  /api/v1/products/{id}/sell-units

# Vendor Products
GET  /api/v1/vendor/products
POST /api/v1/vendor/products
PUT  /api/v1/vendor/products/{id}
DELETE /api/v1/vendor/products/{id}
POST /api/v1/vendor/products/{id}/images
POST /api/v1/vendor/products/{id}/sell-units

# Inventory
GET  /api/v1/vendor/products/{id}/inventory
PUT  /api/v1/vendor/products/{id}/inventory
POST /api/v1/vendor/products/{id}/inventory/adjust
```

---

## 📱 Phase 4: Cart & Orders

### Goals
- Shopping cart
- Checkout flow
- Address management
- Order placement
- Order history & tracking
- Vendor order management

### Screens to Build

```
📱 Buyer Screens
├── /cart                   → Shopping cart
├── /checkout               → Checkout flow
├── /checkout/address       → Address selection
├── /checkout/payment       → Payment options
├── /orders                 → Order history
├── /orders/[id]            → Order detail & tracking
└── /addresses              → Saved addresses

👨‍💼 Vendor Screens
├── /vendor/orders          → Order list
├── /vendor/orders/[id]     → Order detail
└── /vendor/orders/pending  → New orders queue

🎨 New Components
├── cart/CartDrawer              → Slide-out cart
├── cart/CartItem                → Cart line item
├── cart/CartSummary             → Subtotal, delivery, total
├── cart/EmptyCart               → Empty state
├── checkout/AddressCard         → Address display
├── checkout/AddressForm         → Add/Edit address
├── checkout/AddressPicker       → Address selection
├── checkout/DeliverySlot        → Time slot picker
├── checkout/PaymentMethod       → COD/Online toggle
├── checkout/OrderSummary        → Final summary
├── order/OrderCard              → Order list item
├── order/OrderDetail            → Full order view
├── order/OrderTimeline          → Status timeline
├── order/OrderItem              → Order line item
├── vendor/OrderTable            → Orders data table
├── vendor/OrderActions          → Confirm/Ship/Deliver
└── vendor/OrderStatusBadge      → Status badges
```

### Tasks

```
Phase 4 Tasks
├── 4.1 Cart
│   ├── Cart state in Redux
│   ├── Add to cart from product page
│   ├── Cart drawer (slide-out)
│   ├── Update quantity
│   ├── Remove item
│   ├── Cart summary
│   ├── Proceed to checkout CTA
│   └── Persist cart (localStorage)
│
├── 4.2 Address Management
│   ├── Address list page
│   ├── Add new address form
│   ├── Map picker for coordinates
│   ├── Edit address
│   ├── Delete address
│   ├── Set default address
│   └── Delivery check (serviceable area)
│
├── 4.3 Checkout Flow
│   ├── Step 1: Address selection
│   ├── Step 2: Delivery time (optional)
│   ├── Step 3: Payment method
│   ├── Step 4: Order review
│   ├── Order summary sidebar
│   ├── Apply coupon (UI only, Phase 5)
│   ├── Place order button
│   └── Order confirmation screen
│
├── 4.4 Orders (Buyer)
│   ├── Order history list
│   ├── Filter by status
│   ├── Order detail page
│   ├── Order status timeline
│   ├── Cancel order
│   ├── Track order
│   └── Reorder functionality
│
├── 4.5 Orders (Vendor)
│   ├── New orders notification
│   ├── Orders table with filters
│   ├── Order detail view
│   ├── Accept/Reject order
│   ├── Update status workflow
│   │   ├── Confirm order
│   │   ├── Mark as processing
│   │   ├── Mark as shipped
│   │   └── Mark as delivered
│   └── Order analytics (basic)
│
└── 4.6 Real-time Updates
    ├── Order status notifications
    ├── Toast notifications
    └── Badge count updates
```

### API Endpoints Used
```
# Cart
GET  /api/v1/cart
POST /api/v1/cart/items
PUT  /api/v1/cart/items/{id}
DELETE /api/v1/cart/items/{id}
DELETE /api/v1/cart
GET  /api/v1/cart/summary

# Addresses
GET  /api/v1/addresses
POST /api/v1/addresses
PUT  /api/v1/addresses/{id}
DELETE /api/v1/addresses/{id}
POST /api/v1/addresses/{id}/default

# Orders (Buyer)
POST /api/v1/orders
GET  /api/v1/orders
GET  /api/v1/orders/{id}
POST /api/v1/orders/{id}/cancel
GET  /api/v1/orders/track/{order_number}

# Orders (Vendor)
GET  /api/v1/vendor/orders
GET  /api/v1/vendor/orders/{id}
PUT  /api/v1/vendor/orders/{id}/status
POST /api/v1/vendor/orders/{id}/confirm
POST /api/v1/vendor/orders/{id}/ship
POST /api/v1/vendor/orders/{id}/deliver
```

---

## 🎨 Design Guidelines

### Color Palette (Zepto-Inspired)

```css
/* Primary Colors */
--primary: #7B2D8E;        /* Purple - Main brand */
--primary-dark: #5A1F68;   /* Darker purple */
--primary-light: #9B4DAE;  /* Lighter purple */

/* Secondary */
--secondary: #FF6B35;      /* Orange - CTAs */
--secondary-dark: #E55520;

/* Semantic */
--success: #22C55E;        /* Green */
--warning: #F59E0B;        /* Amber */
--error: #EF4444;          /* Red */
--info: #3B82F6;           /* Blue */

/* Neutrals */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-500: #6B7280;
--gray-900: #111827;

/* Background */
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-accent: #FDF4FF;      /* Light purple tint */
```

### Typography

```css
/* Font Family */
font-family: 'Inter', system-ui, sans-serif;

/* Scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### Spacing

```css
/* Base: 4px */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
```

### Border Radius

```css
--radius-sm: 0.375rem;  /* 6px - buttons, inputs */
--radius-md: 0.5rem;    /* 8px - cards */
--radius-lg: 0.75rem;   /* 12px - modals */
--radius-xl: 1rem;      /* 16px - large cards */
--radius-full: 9999px;  /* pills, avatars */
```

---

## 📅 Implementation Timeline

| Phase | Duration | Parallel Backend Phase |
|-------|----------|----------------------|
| Phase 1 | 1 week | Backend Phase 1 ✅ |
| Phase 2 | 1 week | Backend Phase 2 ✅ |
| Phase 3 | 1.5 weeks | Backend Phase 3 ✅ |
| Phase 4 | 1.5 weeks | Backend Phase 4 ✅ |

**Total: ~5 weeks for MVP**

---

## 🚀 Getting Started

```bash
# Create Next.js project
npx create-next-app@14 frontend --typescript --tailwind --eslint --app

# Install dependencies
cd frontend
npm install @reduxjs/toolkit react-redux axios react-hook-form zod @hookform/resolvers
npm install framer-motion lucide-react react-hot-toast
npm install -D @types/node

# Start development
npm run dev
```

---

## 📋 Phase 1 Checklist (Start Here)

- [ ] Create Next.js 14 project
- [ ] Configure Tailwind with custom theme
- [ ] Setup Redux Toolkit store
- [ ] Create Axios instance with interceptors
- [ ] Build base UI components (Button, Input, Card)
- [ ] Create auth API slice (RTK Query)
- [ ] Build Login page
- [ ] Build Register page
- [ ] Add auth state persistence
- [ ] Create protected route middleware
- [ ] Build Profile page
- [ ] Add Header component
- [ ] Add Mobile bottom navigation
- [ ] Test auth flow end-to-end

---

Ready to start **Phase 1**? Let me know! 🚀

