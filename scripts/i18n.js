// Traductions : extrait les textes français à traduire et génère le catalogue.
//   node scripts/i18n.js keys    → i18n/keys.json + textes manquants par langue
//   node scripts/i18n.js build   → src/i18n/catalog.js (à partir de i18n/<langue>.json)
// Les textes viennent du code (littéraux français, « ${x} » devenant « {0} »),
// de la base de connaissances (messages, limitations…) et des notes de pièces.
// Les noms de pièces et de générations passent par le glossaire (src/i18n/glossary.js).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadData } from './data-node.js';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
export const TARGETS = ['en', 'de', 'es', 'it'];

/** Littéraux de chaîne d'un fichier JS ; les interpolations deviennent {0}, {1}… */
export function literals(src) {
  const out = [];
  let i = 0;
  const readStr = (q) => {
    let s = '';
    i++;
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\') { s += src[i + 1] === q || src[i + 1] === '\\' ? src[i + 1] : src[i] + src[i + 1]; i += 2; continue; }
      s += src[i++];
    }
    i++;
    return s;
  };
  const readTpl = () => {
    let s = '';
    let n = 0;
    i++;
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') { s += src[i + 1] === '`' || src[i + 1] === '\\' || src[i + 1] === '$' ? src[i + 1] : src[i] + src[i + 1]; i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        i += 2;
        let d = 1;
        while (d && i < src.length) {
          const c = src[i];
          if (c === "'" || c === '"') { out.push(readStr(c)); continue; }
          if (c === '`') { out.push(readTpl()); continue; }
          if (c === '{') d++;
          else if (c === '}') d--;
          i++;
        }
        s += `{${n++}}`;
        continue;
      }
      s += src[i++];
    }
    i++;
    return s;
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 2; continue; }
    if (c === "'" || c === '"') { out.push(readStr(c)); continue; }
    if (c === '`') { out.push(readTpl()); continue; }
    if (c === '/' && /[=(,:;!&|?{}[\n]\s*$/.test(src.slice(Math.max(0, i - 20), i))) {
      i++;
      while (i < src.length && src[i] !== '/') {
        if (src[i] === '\\') i++;
        else if (src[i] === '[') { while (i < src.length && src[i] !== ']') { if (src[i] === '\\') i++; i++; } }
        i++;
      }
      i++;
      continue;
    }
    i++;
  }
  return out;
}

const FRENCH_WORDS = /\b(vitesses?|dents|pignons?|plateaux?|chaîne|disques?|freins?|manettes?|leviers?|cadre|roue|moyeu|boîtier|pédalier|étrier|patins?|plaquettes?|outils?|réglages?|cassette|dérailleurs?)\b/i;
const looksFrench = (s) => {
  const text = s.replace(/<[^>]+>/g, ' ').replace(/\{\d+\}/g, ' ');
  if (FRENCH_WORDS.test(text)) return true;
  if (/^[A-ZÉ][a-zéèêàç]{3,}$/.test(s.trim())) return true;
  if (/^[a-z0-9_.\/:#-]+$/i.test(s.trim())) return /[àâçéèêëîïôûùüœ]/.test(s);
  return /\p{L}{2}/u.test(text) && (/[àâçéèêëîïôûùüœ«»]/i.test(text) || /\b(le|la|les|de|des|du|un|une|et|ou|sur|avec|pour|par|sans|non|pas|au|aux|en|à)\b/i.test(text) || /^[A-ZÉ][a-zéèêàç]+(\s|$)/.test(text.trim()));
};
// Code, sélecteurs CSS, HTML sans texte, identifiants : rien à traduire.
const isCode = (s) => /^\s*$/.test(s.replace(/<[^>]*>/g, '').replace(/\{\d+\}/g, '').replace(/[^\p{L}]/gu, ''))
  || /^(https?:|#\/|\.\/|[a-z]+\[|\[data-|[a-z-]+=)/.test(s) || /^[\w-]+(\.[\w-]+)+$/.test(s) || /=>|\bconst\b|function\s*\(/.test(s);

function walk(dir, ext) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = `${dir}/${d.name}`;
    if (d.isDirectory()) return d.name === 'i18n' ? [] : walk(p, ext);
    return p.endsWith(ext) ? [p] : [];
  });
}

/** Tous les textes français à traduire (hors noms de pièces et générations). */
export function collectKeys() {
  const keys = new Set();
  for (const f of [...walk(root('src'), '.js'), ...walk(root('app'), '.js')]) {
    for (const l of literals(readFileSync(f, 'utf8'))) {
      const s = l.trim() === l ? l : l.trim();
      if (s && looksFrench(s) && !isCode(s)) keys.add(s);
    }
  }
  for (const l of readFileSync(root('app/index.html'), 'utf8').matchAll(/data-t(?:-label)?="([^"]+)"/g)) keys.add(l[1]);
  // Tout texte passé directement à t('…') dans l'interface, même un mot seul.
  for (const f of walk(root('app'), '.js')) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\bt\('((?:[^'\\]|\\.)+)'/g)) keys.add(m[1].replace(/\\'/g, "'"));
  }
  // Libellés courts affichés tels quels (niveaux, disciplines, critères de recherche).
  for (const k of ['oui', 'non', 'connu', 'incompatible', 'VTT', 'Route', 'Gravel', 'Polyvalent', 'type', 'discipline', 'chape', 'commande',
    'freinage', 'fluide', 'plus grand pignon', 'plus petit pignon', 'plateaux', 'vitesses', 'corps de roue libre']) keys.add(k);
  const { parts, kb } = loadData();
  const TEXT = new Set(['message', 'limitation', 'condition', 'label', 'adjustments', 'tools', 'extraParts', 'adapter', 'gamme']);
  const visit = (o, key) => {
    if (typeof o === 'string') { if (TEXT.has(key) && /\p{L}{2}/u.test(o)) keys.add(o); return; }
    if (Array.isArray(o)) { for (const v of o) visit(v, key); return; }
    if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (k !== 'source' && k !== 'sources') visit(v, k);
  };
  visit(kb.tables, '');
  for (const p of parts) if (p.notes) keys.add(p.notes);
  // Types de source affichés tels quels.
  for (const k of ['officiel', 'revendeur', 'communaute', 'presse', 'physique', 'a_sourcer', 'cassette', 'roue_libre', 'route', 'vtt', 'gravel', 'autre']) keys.add(k);
  return [...keys].sort((a, b) => a.localeCompare(b, 'fr'));
}

const readLang = (code) => (existsSync(root(`i18n/${code}.json`)) ? JSON.parse(readFileSync(root(`i18n/${code}.json`), 'utf8')) : {});

function buildCatalog() {
  const catalog = Object.fromEntries(TARGETS.map((c) => [c, readLang(c)]));
  const body = `// Généré par scripts/i18n.js à partir de i18n/*.json : ne pas modifier à la main.\nexport default ${JSON.stringify(catalog)};\n`;
  writeFileSync(root('src/i18n/catalog.js'), body);
  console.log(`src/i18n/catalog.js : ${TARGETS.map((c) => `${c} ${Object.keys(catalog[c]).length}`).join(', ')}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const cmd = process.argv[2] ?? 'keys';
  if (cmd === 'keys') {
    const keys = collectKeys();
    mkdirSync(root('i18n'), { recursive: true });
    writeFileSync(root('i18n/keys.json'), `${JSON.stringify(keys, null, 1)}\n`);
    console.log(`${keys.length} textes`);
    for (const c of TARGETS) {
      const d = readLang(c);
      const miss = keys.filter((k) => !Object.hasOwn(d, k));
      console.log(`${c} : ${miss.length} manquant(s)`);
    }
  } else if (cmd === 'build') buildCatalog();
  else throw new Error(`Commande inconnue : ${cmd}`);
}
