/**
 * API Configuration
 * 
 * This file ensures API_URL is properly configured and throws an error if missing.
 * This prevents the app from silently falling back to localhost.
 */

import Constants from 'expo-constants';

/**
 * Get API URL from configuration
 * 
 * Priority:
 * 1. Constants.expoConfig?.extra?.apiUrl (from app.config.js - most reliable)
 * 2. Constants.manifest?.extra?.apiUrl (alternative manifest location)
 * 3. process.env.EXPO_PUBLIC_API_URL (from .env file)
 * 
 * ❌ NO localhost fallback - throws error if missing
 */
const getApiUrl = (): string => {
  // Priority 1: app.config.js extra field (most reliable)
  const configApiUrl = Constants.expoConfig?.extra?.apiUrl || Constants.manifest?.extra?.apiUrl;
  if (configApiUrl && configApiUrl !== 'MISSING_API_URL' && configApiUrl !== 'INVALID_API_URL') {
    return configApiUrl as string;
  }
  
  // Priority 2: process.env (from .env file)
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envApiUrl && (envApiUrl.startsWith('http://') || envApiUrl.startsWith('https://'))) {
    return envApiUrl;
  }
  
  // ❌ NO FALLBACK - Throw error if API URL is missing
  const errorMsg = `
❌ API_URL is missing!

Configuration check:
1. ✅ Ensure .env file exists in mobile/ directory
2. ✅ Ensure .env contains: EXPO_PUBLIC_API_URL=http://YOUR_IP:8000/api/v1
3. ✅ Ensure app.config.js reads from .env correctly
4. ✅ Restart Expo with: npx expo start --lan --clear

Current values:
- Constants.expoConfig?.extra?.apiUrl: ${configApiUrl || 'not set'}
- Constants.manifest?.extra?.apiUrl: ${Constants.manifest?.extra?.apiUrl || 'not set'}
- process.env.EXPO_PUBLIC_API_URL: ${envApiUrl || 'not set'}

Example .env file:
EXPO_PUBLIC_API_URL=http://192.168.0.116:8000/api/v1
`;
  
  console.error(errorMsg);
  throw new Error("API_URL is missing — check EXPO_PUBLIC_API_URL in .env or app.config.js");
};

const API_URL = getApiUrl();

// Log API URL on app start (only in development)
if (__DEV__) {
  console.log("✅ API_URL:", API_URL);
  console.log("🔍 Configuration sources:", {
    "Constants.expoConfig?.extra?.apiUrl": Constants.expoConfig?.extra?.apiUrl || "not set",
    "Constants.manifest?.extra?.apiUrl": Constants.manifest?.extra?.apiUrl || "not set",
    "process.env.EXPO_PUBLIC_API_URL": process.env.EXPO_PUBLIC_API_URL || "not set",
  });
}

export default API_URL;
