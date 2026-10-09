const { withAndroidManifest, withInfoPlist } = require("expo/config-plugins");
module.exports = (config) => {
  if (!config.extra?.localPreview) return config;
  const apiUrl = new URL(config.extra.apiUrl);
  if (!["127.0.0.1", "localhost", "10.0.2.2"].includes(apiUrl.hostname))
    throw new Error(
      "Local preview builds require a loopback/emulator API host.",
    );
  config = withAndroidManifest(config, (c) => {
    c.modResults.manifest.application[0].$["android:usesCleartextTraffic"] =
      "true";
    return c;
  });
  return withInfoPlist(config, (c) => {
    c.modResults.NSAppTransportSecurity = { NSAllowsLocalNetworking: true };
    return c;
  });
};
