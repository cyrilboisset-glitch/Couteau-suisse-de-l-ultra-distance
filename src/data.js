// Chargement des fichiers de données. Chaque fichier déclare un dictionnaire
// `sources` ; pièces et entrées y renvoient par `src` (une clé ou une liste).
// Le résultat est un catalogue plat + une base de connaissances.
import { createKnowledge } from './knowledge.js';

const asList = (x) => (Array.isArray(x) ? x : x ? [x] : []);

function expandSources(item, dict, file) {
  const out = asList(item.src).map((k) => {
    const s = dict[k];
    if (!s) throw new Error(`${file} : source « ${k} » inconnue (élément ${item.id ?? JSON.stringify(item).slice(0, 60)})`);
    return s;
  });
  const { src, ...rest } = item;
  return { rest, sources: [...out, ...asList(item.sources)] };
}

/** files : [{ name, json }] — renvoie { parts, knowledgeRaw, kb } */
export function assemble(files) {
  const parts = [];
  const raw = {};
  for (const { name, json } of files) {
    const dict = json.sources ?? {};
    for (const p of json.parts ?? []) {
      const { rest, sources } = expandSources(p, dict, name);
      parts.push({ ...json.defaults, ...rest, sources, file: name });
    }
    for (const [table, entries] of Object.entries(json)) {
      if (['sources', 'parts', 'defaults', '_meta'].includes(table)) continue;
      raw[table] ??= [];
      for (const e of entries) {
        const { rest, sources } = expandSources(e, dict, name);
        raw[table].push({ ...rest, source: sources[0] ?? null, sources, file: name });
      }
    }
  }
  return { parts, knowledgeRaw: raw, kb: createKnowledge(raw) };
}
