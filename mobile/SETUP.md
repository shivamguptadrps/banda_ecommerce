# Mobile App Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
   ```bash
   node --version
   ```

2. **npm** or **yarn**
   ```bash
   npm --version
   ```

3. **Expo CLI** (installed globally or via npx)
   ```bash
   npm install -g expo-cli
   # OR use npx expo
   ```

4. **iOS Simulator** (Mac only)
   - Install Xcode from App Store
   - Open Xcode → Preferences → Components → Install iOS Simulator

5. **Android Emulator** (Optional)
   - Install Android Studio
   - Create an Android Virtual Device (AVD)

## Installation Steps

### 1. Navigate to Mobile Directory

```bash
cd mobile
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- React Native
- Expo
- Redux Toolkit
- React Navigation
- NativeWind (Tailwind CSS)
- And all other dependencies

### 3. Environment Setup

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set your API URL:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**For production:**
```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

### 4. Start Development Server

```bash
npm start
```

This will:
- Start the Expo development server
- Open Expo DevTools in your browser
- Show a QR code for testing on physical devices

### 5. Run on Simulator/Emulator

**iOS (Mac only):**
```bash
npm run ios
# OR press 'i' in the terminal
```

**Android:**
```bash
npm run android
# OR press 'a' in the terminal
```

**Web (for testing):**
```bash
npm run web
# OR press 'w' in the terminal
```

## Testing on Physical Device

### iOS (iPhone/iPad)

1. Install **Expo Go** from App Store
2. Make sure your phone and computer are on the same WiFi
3. Scan the QR code from the terminal
4. App will open in Expo Go

### Android

1. Install **Expo Go** from Play Store
2. Make sure your phone and computer are on the same WiFi
3. Scan the QR code from the terminal
4. App will open in Expo Go

## Troubleshooting

### Issue: "Cannot connect to Metro bundler"

**Solution:**
```bash
# Clear cache and restart
npm start -- --clear
```

### Issue: "Module not found"

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: "Expo CLI not found"

**Solution:**
```bash
# Install Expo CLI globally
npm install -g expo-cli

# OR use npx
npx expo start
```

### Issue: "Port 19000 already in use"

**Solution:**
```bash
# Kill the process using port 19000
lsof -ti:19000 | xargs kill -9

# OR use a different port
expo start --port 19001
```

### Issue: "API connection failed"

**Solution:**
1. Make sure your backend is running
2. Check `.env` file has correct API URL
3. For iOS Simulator, use `http://localhost:8000`
4. For Android Emulator, use `http://10.0.2.2:8000`
5. For physical device, use your computer's local IP: `http://192.168.x.x:8000`

## Development Workflow

### Hot Reload

- Changes to code automatically reload the app
- Press `r` in terminal to reload manually
- Press `m` to toggle menu

### Debugging

1. **React Native Debugger:**
   - Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
   - Select "Debug"

2. **Console Logs:**
   - Check terminal for logs
   - Use `console.log()` in your code

3. **Redux DevTools:**
   - Install Redux DevTools browser extension
   - Connect via React Native Debugger

### Code Formatting

```bash
# Run linter
npm run lint

# Type check
npm run type-check
```

## Building for Production

### iOS

```bash
# Build for App Store
eas build --platform ios

# Or build locally (requires Xcode)
expo build:ios
```

### Android

```bash
# Build for Play Store
eas build --platform android

# Or build locally (requires Android Studio)
expo build:android
```

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # Screen components
│   ├── components/      # Reusable components
│   ├── navigation/      # Navigation setup
│   ├── store/           # Redux store
│   ├── lib/             # Utilities
│   └── types/           # TypeScript types
├── App.tsx              # Root component
├── package.json
└── tsconfig.json
```

## Useful Commands

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web

# Clear cache
npm start -- --clear

# Type check
npm run type-check

# Lint code
npm run lint
```

## Next Steps

1. ✅ Phase 1: Foundation & Auth (Complete)
2. ⏳ Phase 2: Home & Categories
3. ⏳ Phase 3: Product Catalog
4. ⏳ Phase 4: Cart & Checkout
5. ⏳ Phase 5: Orders & Tracking

## Support

For issues or questions:
- Check the [React Native Roadmap](./REACT_NATIVE_ROADMAP.md)
- Review [Phase 1 Summary](./PHASE1_SUMMARY.md)
- Check Expo documentation: https://docs.expo.dev

