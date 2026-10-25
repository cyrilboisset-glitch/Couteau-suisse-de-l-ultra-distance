// Valide et fusionne data/ → dist/catalogue.json + docs/COUVERTURE.md
//   node scripts/build-data.js
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadData } from './data-node.js';
import { validatePart, PART_TYPES } from '../src/schema.js';
import { levelFromName } from '../src/levels.js';

export function checkData({ parts, knowledgeRaw }) {
  const errors = [];
  const ids = new Set();
  const families = new Set((knowledgeRaw.families ?? []).map((f) => f.id));
  const report = [];
  for (const p of parts) {
    if (ids.has(p.id)) errors.push(`${p.file} : id en double « ${p.id} »`);
    ids.add(p.id);
    const v = validatePart(p);
    for (const e of v.errors) errors.push(`${p.file} / ${p.id} : ${e}`);
    if (!p.sources.length) errors.push(`${p.file} / ${p.id} : aucune source`);
    for (const s of p.sources) if (!s.url && s.kind !== 'physique') errors.push(`${p.file} / ${p.id} : source sans URL`);
    if (p.attrs?.family && !families.has(p.attrs.family)) errors.push(`${p.file} / ${p.id} : famille inconnue « ${p.attrs.family} »`);
    report.push({ p, missing: v.missing });
  }
  for (const [table, entries] of Object.entries(knowledgeRaw)) {
    for (const e of entries) {
      const label = `${e.file} / ${table}`;
      if (!e.sources.length) errors.push(`${label} : entrée sans source ${JSON.stringify(e).slice(0, 80)}`);
      if (!['valide', 'a_valider'].includes(e.status)) errors.push(`${label} : statut manquant ou inconnu (${e.status})`);
      if (table === 'chainLength') continue;
      if (table !== 'families' && table !== 'recommendations') {
        try { levelFromName(e.level); } catch (err) { errors.push(`${label} : ${err.message}`); }
        if (!e.message) errors.push(`${label} : message manquant`);
      }
    }
  }
  for (const a of knowledgeRaw.actuation ?? []) {
    for (const f of [a.shifterFamily, a.derailleurFamily]) if (!families.has(f)) errors.push(`actuation : famille inconnue « ${f} »`);
  }
  return { errors, report };
}

function coverage(report, knowledgeRaw) {
  const lines = ['# Couverture de la base', '', '> Généré par `node scripts/build-data.js` — ne pas éditer à la main.', ''];
  const byType = {};
  for (const r of report) (byType[r.p.type] ??= []).push(r);
  const n = report.length;
  const pending = report.filter((r) => r.p.status !== 'valide').length;
  lines.push(`- **${n} pièces**, dont ${n - pending} validées par une page constructeur et **${pending} à valider**.`);
  const kbCount = Object.entries(knowledgeRaw).map(([t, e]) => `${t} : ${e.length}`).join(', ');
  lines.push(`- Base de connaissances : ${kbCount}.`, '');
  const brands = {};
  for (const r of report) brands[r.p.brand] = (brands[r.p.brand] ?? 0) + 1;
  lines.push('| Marque | Pièces |', '|---|---|', ...Object.entries(brands).sort().map(([b, c]) => `| ${b} | ${c} |`), '');
  for (const [type, rows] of Object.entries(byType)) {
    lines.push(`## ${PART_TYPES[type].label} (${rows.length})`, '', '| Réf. | Marque | Discipline | Statut | Champs manquants |', '|---|---|---|---|---|');
    for (const { p, missing } of rows.sort((a, b) => a.p.id.localeCompare(b.p.id))) {
      lines.push(`| ${p.ref} | ${p.brand} | ${p.discipline ?? ''} | ${p.status === 'valide' ? 'validé' : 'à valider'} | ${missing.join(', ')} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = loadData();
  const { errors, report } = checkData(data);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../dist/catalogue.json', import.meta.url), JSON.stringify({ parts: data.parts, knowledge: data.knowledgeRaw }));
  writeFileSync(new URL('../docs/COUVERTURE.md', import.meta.url), coverage(report, data.knowledgeRaw));
  console.log(`${data.parts.length} pièces, OK`);
}
