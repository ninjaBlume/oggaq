// Writes tokens.css: the palette as CSS custom properties for web and admin.
// Light is the default; the device's dark preference applies unless the user forced light;
// data-theme="dark" forces dark. Run: npm run generate --workspace @oggaq/design-tokens
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cssTokens } from '../src/css.ts';

writeFileSync(fileURLToPath(new URL('../tokens.css', import.meta.url)), cssTokens());
// The static legal pages (apps/web/public/legal) cannot import the package, so they carry a copy; apps/web tests check it.
writeFileSync(fileURLToPath(new URL('../../../apps/web/public/legal/tokens.css', import.meta.url)), cssTokens());
