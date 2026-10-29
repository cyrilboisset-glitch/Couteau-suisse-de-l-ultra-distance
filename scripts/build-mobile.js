// Version mobile (Android, via Capacitor) : un seul fichier HTML, code minifié,
// base compressée et chiffrée (voir app/vault.js).
//   node scripts/build-mobile.js   (après npm run build) → dist/mobile/index.html
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes, createCipheriv } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

// Nouvelle clé à chaque build, découpée et masquée dans le code.
const key = randomBytes(32);
const parts = [0, 1, 2, 3].map((i) => Buffer.from([...key.subarray(i * 8, i * 8 + 8)].map((b, j) => b ^ (0x5a + i * 17 + j))).toString('base64'));
const iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', key, iv);
const plain = gzipSync(readFileSync(root('dist/www/catalogue.json')), { level: 9 });
const data = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);

const bundle = await build({
  entryPoints: [root('dist/www/app.js')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020',
  define: { __VAULT_KEY__: JSON.stringify(parts) }, legalComments: 'none',
});
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(root('dist/www/style.css'), 'utf8');
const enc = JSON.stringify({ iv: iv.toString('base64'), data: data.toString('base64') });
const html = readFileSync(root('dist/www/index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}</style>`)
  .replace('<script type="module" src="app.js"></script>', () => `<script>window.__CATALOGUE_ENC__=${enc};</script>\n<script>${js}</script>`);

rmSync(root('dist/mobile'), { recursive: true, force: true });
mkdirSync(root('dist/mobile'), { recursive: true });
writeFileSync(root('dist/mobile/index.html'), html);
console.log(`dist/mobile/index.html (${Math.round(html.length / 1024)} Ko, base chiffrée)`);
