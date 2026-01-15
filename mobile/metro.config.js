const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure Metro bundler can be accessed from network
config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => {
        return middleware;
    },
};

module.exports = config;

