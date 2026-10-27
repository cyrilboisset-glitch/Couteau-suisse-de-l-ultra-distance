// Traduction de l'interface, des verdicts du moteur et des textes de la base.
// Le français est la langue source : chaque texte français sert de clé.
// Les messages construits par le moteur (« Portée 39–49 mm, cadre 60 mm. »)
// sont reconnus grâce aux modèles du catalogue (« Portée {0}–{1} mm, cadre {2} mm. »).
import CATALOG from './catalog.js';
import { GLOSSARY } from './glossary.js';

export const LANGS = Object.freeze([
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
]);
const CODES = LANGS.map((l) => l.code);

let lang = 'fr';
const caches = new Map();
const compiled = new Map();

export const getLang = () => lang;
export function setLang(code) {
  lang = CODES.includes(code) ? code : 'fr';
  return lang;
}

/** Langue préférée du navigateur parmi celles disponibles. */
export function detectLang(preferred = []) {
  for (const p of preferred) {
    const c = String(p).slice(0, 2).toLowerCase();
    if (CODES.includes(c)) return c;
  }
  return 'fr';
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fill = (tpl, args) => tpl.replace(/\{(\d+)\}/g, (m, i) => (args[i] !== undefined ? args[i] : m));

// Modèles du catalogue (clés contenant {0}, {1}…) compilés en expressions régulières,
// du plus spécifique (texte fixe le plus long) au plus général.
function templatesFor(code) {
  if (compiled.has(code)) return compiled.get(code);
  const dict = CATALOG[code] ?? {};
  const list = [];
  for (const key of Object.keys(dict)) {
    if (!/\{\d+\}/.test(key)) continue;
    const literal = key.replace(/\{\d+\}/g, '');
    if (literal.replace(/[^\p{L}]/gu, '').length < 4) continue; // trop générique
    const order = [];
    const re = new RegExp(`^${key.split(/(\{\d+\})/).map((part) => {
      const m = part.match(/^\{(\d+)\}$/);
      if (m) { order.push(Number(m[1])); return '([\\s\\S]*?)'; }
      return escapeRe(part);
    }).join('')}$`);
    list.push({ re, order, target: dict[key], weight: literal.length });
  }
  list.sort((a, b) => b.weight - a.weight);
  compiled.set(code, list);
  return list;
}

function translate(text, code, depth) {
  const dict = CATALOG[code];
  if (!dict) return text;
  if (Object.hasOwn(dict, text)) return dict[text];
  const trimmed = text.trim();
  if (trimmed !== text && Object.hasOwn(dict, trimmed)) return text.replace(trimmed, dict[trimmed]);
  if (depth > 2 || !/\p{L}{2}/u.test(text)) return text;
  for (const t of templatesFor(code)) {
    const m = t.re.exec(text);
    if (!m) continue;
    const args = [];
    t.order.forEach((idx, k) => { args[idx] = translate(m[k + 1], code, depth + 1); });
    return fill(t.target, args);
  }
  // Message composé de plusieurs phrases (« Constat. Limitation. ») : phrase par phrase.
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ«(])/u);
  if (sentences.length > 1) return sentences.map((s) => translate(s, code, depth + 1)).join(' ');
  return text;
}

/** Traduit un texte français (exact ou reconnu par un modèle) ; sinon le renvoie tel quel. */
export function tr(text) {
  if (lang === 'fr' || typeof text !== 'string' || !text) return text;
  let cache = caches.get(lang);
  if (!cache) caches.set(lang, (cache = new Map()));
  if (cache.has(text)) return cache.get(text);
  const out = translate(text, lang, 0);
  cache.set(text, out);
  return out;
}

/** Texte d'interface avec paramètres : t('{0} pièces', n). */
export const t = (text, ...args) => fill(lang === 'fr' ? text : tr(text), args);

/**
 * Noms de pièces et de générations : catalogue exact d'abord, puis glossaire de
 * termes techniques (« chape courte » → « short cage »), puis « 11v » → « 11s ».
 */
export function trName(text) {
  if (lang === 'fr' || typeof text !== 'string' || !text) return text;
  const exact = tr(text);
  if (exact !== text) return exact;
  const g = GLOSSARY[lang];
  if (!g) return text;
  let out = text;
  for (const [fr, target] of g.phrases) out = out.replace(fr, target);
  return out.replace(/\b(\d{1,2})v\b/g, g.speeds);
}

/** Clés manquantes d'une langue (outil de suivi des traductions). */
export function missingKeys(keys, code) {
  const dict = CATALOG[code] ?? {};
  return keys.filter((k) => !Object.hasOwn(dict, k));
}
