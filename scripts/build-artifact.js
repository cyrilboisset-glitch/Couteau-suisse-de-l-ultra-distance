// Prépare un aperçu publiable (page sans squelette + fichiers) dans dist/artifact/.
//   node scripts/build-artifact.js   (après npm run build)
import { readFileSync, writeFileSync, cpSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const out = root('dist/artifact/');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(root('dist/www'), out, { recursive: true });
const html = readFileSync(root('dist/www/index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\s*/, '')
  .replace(/<meta name="viewport"[^>]*>\s*/, '');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
writeFileSync(`${out}index.html`, `${head.trim()}\n${body.trim()}\n`);
console.log('dist/artifact prêt');
