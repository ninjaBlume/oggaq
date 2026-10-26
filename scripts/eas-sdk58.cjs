// Temporary compatibility bridge: EAS CLI 26 embeds config-plugins 55, whose
// identifier conversion drops Turkish letters. SDK 58 prebuild transliterates them.
// Use the project's conversion only in EAS's iOS project metadata resolvers.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

function compatibleConfigPlugins(request, parentFile, value, cliRoot, sanitizedName) {
  if (request !== '@expo/config-plugins' || !parentFile?.startsWith(path.join(cliRoot, 'build', 'project', 'ios') + path.sep)) return value;
  return { ...value, IOSConfig: { ...value.IOSConfig, XcodeUtils: { ...value.IOSConfig.XcodeUtils, sanitizedName } } };
}
module.exports = { compatibleConfigPlugins };

async function main() {
  const projectDir = path.resolve(__dirname, '../apps/mobile');
  const projectRequire = Module.createRequire(path.join(projectDir, 'package.json'));
  const entry = process.env.PATH.split(path.delimiter).map(dir => path.join(dir, 'eas')).find(file => fs.existsSync(file));
  if (!entry) throw new Error('Run with npm exec --package=eas-cli@26.0.0 -- node scripts/eas-sdk58.cjs ...');
  const cliEntry = fs.realpathSync(entry);
  const cliRoot = path.dirname(path.dirname(cliEntry));
  const cliVersion = JSON.parse(fs.readFileSync(path.join(cliRoot, 'package.json'), 'utf8')).version;
  const sdkVersion = projectRequire('@expo/config-plugins/package.json').version;
  if (cliVersion !== '26.0.0' || !sdkVersion.startsWith('58.')) throw new Error('EAS/SDK version changed; review the temporary iOS name bridge before building.');
  const sanitizedName = projectRequire('@expo/config-plugins').IOSConfig.XcodeUtils.sanitizedName;
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    return compatibleConfigPlugins(request, parent?.filename, originalLoad.apply(this, arguments), cliRoot, sanitizedName);
  };
  process.chdir(projectDir);
  if (process.argv[2] === '--check-ios-target') {
    const { exp } = projectRequire('@expo/config').getConfig(projectDir);
    const cliRequire = Module.createRequire(path.join(cliRoot, 'package.json'));
    const context = await cliRequire('./build/project/ios/scheme.js').resolveXcodeBuildContextAsync({ exp, projectDir, nonInteractive: true }, {});
    const bundle = await cliRequire('./build/project/ios/bundleIdentifier.js').getBundleIdentifierAsync(projectDir, exp, undefined, { targetName: context.buildScheme });
    if (context.buildScheme !== sanitizedName(exp.name)) throw new Error('EAS/native target mismatch');
    console.log(JSON.stringify({ cli: cliVersion, sdk: sdkVersion, displayName: exp.name, target: context.buildScheme, bundleIdentifier: bundle }));
    return;
  }
  require(cliEntry);
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
