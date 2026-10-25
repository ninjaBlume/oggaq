const { getDefaultConfig } = require("expo/metro-config");
const { resolve } = require("node:path");
const config = getDefaultConfig(__dirname);
// Expo watches workspace packages, but config/ is outside those packages.
// Brand JSON and shared assets must invalidate the running development bundle.
config.watchFolders = [...new Set([...config.watchFolders, resolve(__dirname, "../../config")])];
module.exports = config;
