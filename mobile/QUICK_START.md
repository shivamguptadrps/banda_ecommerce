# Quick Start Guide - Mobile App

## Starting the Mobile App

### Option 1: Using the start script (Recommended)
```bash
cd mobile
./start_mobile.sh
```

### Option 2: Manual start
```bash
cd mobile

# Load NVM (if using nvm)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Or use direct path
export PATH="$HOME/.nvm/versions/node/v18.20.8/bin:$PATH"

# Install dependencies (first time only)
npm install

# Start Expo
npm start
```

### Option 3: Using start_all.sh (starts all services)
```bash
./start_all.sh
```

## Troubleshooting

### Node.js not found
If you see "node not found", you need to:
1. Install Node.js via nvm: `nvm install 18.20.8`
2. Or add Node.js to your PATH

### Port 8081 already in use
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9
```

### Dependencies not installed
```bash
cd mobile
npm install
```

### API URL not configured
Check `mobile/.env` file:
```
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Running on Device/Simulator

After `npm start`:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on your phone

## Common Issues

1. **Metro bundler errors**: Clear cache with `npm start -- --clear`
2. **Module not found**: Run `npm install` again
3. **TypeScript errors**: Run `npm run type-check` to see all errors

