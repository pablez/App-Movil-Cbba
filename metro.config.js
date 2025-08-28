// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuraciones adicionales para resolver problemas de módulos
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

module.exports = config;
