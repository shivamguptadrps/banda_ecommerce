# 🛒 Banda E-Commerce Frontend

A modern, responsive quick-commerce frontend built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit + RTK Query
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion
- **Icons**: Lucide React

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (login, register)
│   │   ├── (buyer)/            # Buyer-facing pages
│   │   ├── (vendor)/           # Vendor dashboard
│   │   ├── (admin)/            # Admin panel
│   │   ├── layout.tsx          # Root layout
│   │   └── ...
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── layout/             # Layout components
│   │   └── ...
│   ├── store/                  # Redux store
│   │   ├── slices/             # Redux slices
│   │   └── api/                # RTK Query APIs
│   ├── lib/                    # Utilities
│   ├── hooks/                  # Custom hooks
│   ├── types/                  # TypeScript types
│   └── styles/                 # Global styles
├── public/                     # Static assets
└── ...
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running on http://localhost:8000

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=Banda
```

## 📱 Pages

### Phase 1 (Auth & Layout)
- `/login` - User login
- `/register` - User registration
- `/profile` - User profile
- `/` - Home page

### Phase 2 (Categories & Vendor)
- `/category` - Category listing
- `/category/[slug]` - Category products
- `/vendor/dashboard` - Vendor dashboard
- `/vendor/register` - Vendor onboarding
- `/admin/dashboard` - Admin panel
- `/admin/categories` - Category management
- `/admin/vendors` - Vendor management

### Phase 3 (Products)
- `/products` - Product listing
- `/product/[slug]` - Product detail
- `/vendor/products` - Vendor products
- `/vendor/inventory` - Inventory management

### Phase 4 (Cart & Orders)
- `/cart` - Shopping cart
- `/checkout` - Checkout flow
- `/orders` - Order history
- `/orders/[id]` - Order detail
- `/addresses` - Address management
- `/vendor/orders` - Vendor orders

## 🎨 Design System

### Colors
- **Primary**: Purple (#7B2D8E)
- **Secondary**: Orange (#FF6B35)
- **Success**: Green (#22C55E)
- **Error**: Red (#EF4444)

### Typography
- Font: Inter

## 🧪 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## 📦 Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start development server |
| `build` | Build for production |
| `start` | Start production server |
| `lint` | Run ESLint |

## 🔗 API Integration

The frontend communicates with the FastAPI backend at:
- Development: `http://localhost:8000/api/v1`

API proxy is configured in `next.config.js` to avoid CORS issues during development.

## 📄 License

MIT

