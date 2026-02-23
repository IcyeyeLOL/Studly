const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix: react-native-web module resolution for web (DeviceEventEmitter path)
// RN 0.79+ enables package exports by default; some libs (expo HMR, react-native-web)
// break. Disabling uses legacy resolution.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
