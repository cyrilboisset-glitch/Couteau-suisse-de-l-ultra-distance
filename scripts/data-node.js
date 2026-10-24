// Chargement des données depuis le disque (Node : build, tests).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble } from '../src/data.js';

export const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));

export function readDataFiles(dir = DATA_DIR) {
  const files = [];
  for (const sub of ['knowledge', 'parts']) {
    for (const f of readdirSync(join(dir, sub)).filter((x) => x.endsWith('.json')).sort()) {
      files.push({ name: `${sub}/${f}`, json: JSON.parse(readFileSync(join(dir, sub, f), 'utf8')) });
    }
  }
  return files;
}

export const loadData = (dir) => assemble(readDataFiles(dir));
