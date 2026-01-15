# Banda Mobile App

React Native mobile application for the Banda E-Commerce platform.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your API URL:
```
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Running the App

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Project Structure

```
mobile/
├── src/
│   ├── app/              # Navigation screens
│   ├── components/       # Reusable components
│   ├── store/            # Redux store
│   ├── lib/              # Utilities
│   └── types/            # TypeScript types
├── assets/               # Images, fonts, etc.
└── package.json
```

## Tech Stack

- **React Native** with **Expo**
- **TypeScript**
- **Redux Toolkit** + **RTK Query**
- **React Navigation**
- **NativeWind** (Tailwind CSS)
- **React Hook Form**

## Development

### Phase 1: Foundation & Authentication ✅

- [x] Project setup
- [x] Redux store configuration
- [x] Navigation setup
- [x] Auth API integration
- [x] Login & Register screens
- [x] Protected routes

### Next Steps

- Phase 2: Home & Categories
- Phase 3: Product Catalog
- Phase 4: Cart & Checkout
- Phase 5: Orders & Tracking

## License

Private - Banda E-Commerce

