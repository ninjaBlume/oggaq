// Writes tokens.css: the palette as CSS custom properties for web and admin.
// Light is the default; the device's dark preference applies unless the user forced light;
// data-theme="dark" forces dark. Run: npm run generate --workspace @oggaq/design-tokens
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cssTokens } from '../src/css.ts';

writeFileSync(fileURLToPath(new URL('../tokens.css', import.meta.url)), cssTokens());
