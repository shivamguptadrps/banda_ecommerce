# API URL Configuration Fix

## Problem
The mobile app is hitting the backend with `http://api/v1/categories/tree` instead of `http://192.168.0.116:8000/api/v1/categories/tree`.

## Solution
We've implemented a dual approach:
1. **app.config.js** - Reads from `.env` file and exposes API URL via `Constants.expoConfig.extra.apiUrl`
2. **constants.ts** - Checks both `process.env.EXPO_PUBLIC_API_URL` and `Constants.expoConfig.extra.apiUrl`

## Files Changed
1. `mobile/app.config.js` - Created to read .env and expose API URL
2. `mobile/src/lib/constants.ts` - Updated to use both sources
3. `scripts/dev.ps1` - Fixed PowerShell syntax error
4. `scripts/fix_mobile_env.ps1` - Created to manually fix .env file

## How to Fix

### Step 1: Verify .env file
```powershell
cd mobile
Get-Content .env
```
Should show: `EXPO_PUBLIC_API_URL=http://192.168.0.116:8000/api/v1`

### Step 2: Fix .env if needed
```powershell
cd ..
.\scripts\fix_mobile_env.ps1 -IP "192.168.0.116"
```

### Step 3: Stop Expo completely
Press `Ctrl+C` in the Expo terminal window

### Step 4: Clear all caches and restart
```powershell
cd mobile
# Clear Metro cache
npx expo start --clear --lan
```

### Step 5: Check mobile app console
Look for these logs:
```
🔌 API URL configured: http://192.168.0.116:8000/api/v1
🔍 Debug info: {
  "process.env.EXPO_PUBLIC_API_URL": "http://192.168.0.116:8000/api/v1",
  "Constants.expoConfig?.extra?.apiUrl": "http://192.168.0.116:8000/api/v1",
  "Final API_URL": "http://192.168.0.116:8000/api/v1"
}
```

## Troubleshooting

### If you still see `localhost:8000`:
1. Make sure `.env` file exists and has correct content
2. Make sure `app.config.js` exists (not just `app.json`)
3. Restart Expo with `--clear` flag
4. Check that `expo-constants` is installed: `npm list expo-constants`

### If you see `http://api/v1` (missing IP):
- The .env file is corrupted
- Run: `.\scripts\fix_mobile_env.ps1 -IP "192.168.0.116"`
- Restart Expo with `--clear`

### If environment variable is "not set":
- Expo might not be reading .env file
- Try setting it as environment variable when starting:
  ```powershell
  $env:EXPO_PUBLIC_API_URL="http://192.168.0.116:8000/api/v1"
  npx expo start --clear --lan
  ```
