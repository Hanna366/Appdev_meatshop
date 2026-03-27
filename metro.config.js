const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // React Native's devtools frontend bundle contains import.meta expressions
  // that break in Expo web's classic script output during development.
  if (platform === 'web' && moduleName === 'react-devtools-core') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/shims/reactDevtoolsCore.web.js'),
    };
  }

  // Force CommonJS builds for Zustand on web to avoid import.meta.env checks.
  if (platform === 'web' && moduleName === 'zustand') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/zustand/index.js'),
    };
  }

  if (platform === 'web' && moduleName === 'zustand/middleware') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/zustand/middleware.js'),
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
