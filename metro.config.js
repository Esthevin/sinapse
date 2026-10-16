const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// assets/pdfjs/*.txt (lector de PDF) se empaquetan como recursos, no como código.
config.resolver.assetExts.push('txt');

module.exports = config;
