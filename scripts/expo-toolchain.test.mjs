import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { dirname, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRequire = createRequire(new URL('../apps/mobile/package.json', import.meta.url));
const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'));
const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'));
const { z } = cliRequire('zod');
const { PluginSchema, DevToolsPluginOutputSchema } = cliRequire('./build/src/start/server/DevToolsPlugin.schema.js');
const { createMCPDevToolsExtensionSchema } = cliRequire('./build/src/start/server/createMCPDevToolsExtensionSchema.js');
const plugin = {
  packageName: 'synthetic-devtools', packageRoot: '/synthetic/plugin',
  cliExtensions: { description: 'Synthetic test commands', entryPoint: './commands.js', commands: [
    { name: 'inspect', title: 'Inspect', environments: ['cli', 'mcp'], parameters: [
      { name: 'name', type: 'text' }, { name: 'count', type: 'number' }, { name: 'confirm', type: 'confirm' },
    ] },
  ] },
};

test('Metro watches the canonical brand configuration outside workspace packages', () => {
  const config = mobileRequire('./metro.config.cjs');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const file of ['config/brand.json', 'config/assets/oggsor-logo.png', 'config/fonts/LeagueSpartan-Bold.ttf']) {
    const target = resolve(root, file);
    assert.ok([config.projectRoot, ...config.watchFolders].some((folder) => {
      const path = relative(folder, target);
      return path !== '..' && !path.startsWith('../') && !isAbsolute(path);
    }), `${file} must invalidate Metro's cached module after a change`);
  }
});

test('the mobile workspace resolves the reviewed Expo CLI and fixed Zod version', () => {
  assert.equal(mobileRequire('expo/package.json').version, mobileRequire('./package.json').dependencies.expo);
  assert.equal(expoRequire('@expo/cli/package.json').version, '58.1.17');
  assert.equal(cliRequire('zod/package.json').version, '4.6.6');
  for (const name of ['expo-crypto', 'expo-secure-store', 'expo-splash-screen', 'expo-status-bar', 'expo-updates']) {
    const dependencyRequire = createRequire(mobileRequire.resolve(`${name}/package.json`));
    assert.equal(dependencyRequire.resolve('expo/package.json'), mobileRequire.resolve('expo/package.json'), `${name} must not load a second Expo/CLI tree`);
  }
});
test('real Expo plugin schema accepts valid config and rejects invalid command types', () => {
  assert.equal(PluginSchema.safeParse(plugin).success, true);
  assert.equal(PluginSchema.safeParse({ ...plugin, packageName: '' }).success, false);
  assert.equal(PluginSchema.safeParse({ ...plugin, cliExtensions: { ...plugin.cliExtensions, commands: [
    { name: 'inspect', title: 'Inspect', environments: ['mcp'], parameters: [{ name: 'count', type: 'unknown' }] },
  ] } }).success, false);
});
test('generated MCP command schema keeps enums, typed optional parameters and unknown-field rejection', () => {
  const schema = createMCPDevToolsExtensionSchema(plugin);
  assert.deepEqual(schema.parse({ command: 'inspect', name: 'synthetic', count: 2, confirm: true }), { command: 'inspect', name: 'synthetic', count: 2, confirm: true });
  assert.equal(schema.safeParse({ command: 'inspect' }).success, true);
  for (const input of [{ command: 'unknown' }, { command: 'inspect', count: '2' }, { command: 'inspect', confirm: 'yes' }, { command: 'inspect', extra: true }])
    assert.equal(schema.safeParse(input).success, false);
});
test('Expo output schema validates text, image and audio while rejecting malformed output', () => {
  assert.equal(DevToolsPluginOutputSchema.safeParse([
    { type: 'text', text: 'Synthetic output', level: 'info' },
    { type: 'image', url: 'https://example.test/image.png' },
    { type: 'audio', url: 'https://example.test/audio.wav' },
  ]).success, true);
  assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'image', url: 'invalid' }]).success, false);
  assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'text', text: 1 }]).success, false);
});
test('oversized constrained collections fail before visiting every element (Zod advisory regression)', () => {
  let visited = 0;
  const item = z.string().superRefine(() => { visited++; });
  const inputs = [
    [z.array(item).max(2), Array(1_000).fill('synthetic')],
    [z.set(item).max(2), new Set(Array.from({ length: 1_000 }, (_, i) => String(i)))],
    [z.map(item, item).max(2), new Map(Array.from({ length: 1_000 }, (_, i) => [String(i), 'synthetic']))],
  ];
  for (const [schema, input] of inputs) {
    const result = schema.safeParse(input);
    assert.equal(result.success, false);
    assert.equal(result.error.issues.length, 1);
    assert.equal(result.error.issues[0].code, 'too_big');
  }
  assert.equal(visited, 0);
});
