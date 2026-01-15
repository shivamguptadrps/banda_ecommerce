/**
 * Expo App Configuration
 * This file reads environment variables and makes them available to the app
 */

const fs = require('fs');
const path = require('path');

// Read .env file
function getEnvVars() {
  const envPath = path.join(__dirname, '.env');
  const envVars = {};
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          envVars[key.trim()] = value;
        }
      }
    }
  }
  
  return envVars;
}

const envVars = getEnvVars();

// Get API URL from environment
// Priority: .env file > process.env
// ❌ NO localhost fallback - this ensures we catch configuration errors
let apiUrl = envVars.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL;

// Validate API URL format
if (!apiUrl) {
  console.error('[app.config.js] ❌ EXPO_PUBLIC_API_URL is missing from .env file!');
  console.error('[app.config.js] Please create/update .env with: EXPO_PUBLIC_API_URL=http://YOUR_IP:8000/api/v1');
  // In development, use a warning but don't fail
  // In production, this should fail
  if (process.env.NODE_ENV === 'production') {
    throw new Error('EXPO_PUBLIC_API_URL is required in production');
  }
  // For development, log warning but continue (will fail at runtime in constants.ts)
  apiUrl = 'MISSING_API_URL';
} else if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
  console.error('[app.config.js] ❌ Invalid API URL format:', apiUrl);
  console.error('[app.config.js] Expected format: http://192.168.0.116:8000/api/v1');
  apiUrl = 'INVALID_API_URL';
}

// Log for debugging (only in development)
if (process.env.NODE_ENV !== 'production') {
  if (apiUrl === 'MISSING_API_URL' || apiUrl === 'INVALID_API_URL') {
    console.error('[app.config.js] ⚠️  API URL is not properly configured!');
  } else {
    console.log('[app.config.js] ✅ API URL configured:', apiUrl);
  }
  console.log('[app.config.js] .env file content:', envVars.EXPO_PUBLIC_API_URL || 'not found');
}

module.exports = {
  expo: {
    name: "Banda",
    slug: "banda-mobile",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#7B2D8E"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.banda.mobile"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#7B2D8E"
      },
      package: "com.banda.mobile"
    },
    web: {},
    scheme: "banda",
    extra: {
      eas: {
        projectId: "your-project-id"
      },
      // Make API URL available via Constants.expoConfig.extra.apiUrl
      apiUrl: apiUrl,
    },
    plugins: [
      "expo-font"
    ]
  }
};
