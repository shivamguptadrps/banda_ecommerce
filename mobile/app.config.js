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
// Note: Console output removed to prevent Gradle build errors
if (!apiUrl) {
  // In production, this should fail
  if (process.env.NODE_ENV === 'production') {
    throw new Error('EXPO_PUBLIC_API_URL is required in production');
  }
  // For development, continue (will fail at runtime in constants.ts)
  apiUrl = 'MISSING_API_URL';
} else if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
  apiUrl = 'INVALID_API_URL';
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
      package: "com.banda.mobile",
      versionCode: 1,
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    web: {},
    scheme: "banda",
    extra: {
      eas: {
        projectId: "ec34fc9b-e2e3-4bd6-af66-76754965c9fc"
      },
      // Make API URL available via Constants.expoConfig.extra.apiUrl
      apiUrl: apiUrl,
    },
    plugins: [
      "expo-font",
      "expo-dev-client"
    ]
  }
};
