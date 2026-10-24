// Génère docs/SCHEMA.md à partir de src/schema.js : node scripts/schema-doc.js
import { writeFileSync } from 'node:fs';
import { PART_TYPES, ENUMS } from '../src/schema.js';

const lines = [
  '# Schéma des pièces',
  '',
  '> Fichier généré par `node scripts/schema-doc.js` à partir de `src/schema.js` — ne pas éditer à la main.',
  '',
  'Champs communs à toutes les pièces : `id`, `type`, `brand`, `ref`, `aliases` (fautes / variantes de saisie),',
  '`discipline` (' + ENUMS.discipline.join(', ') + '), `generation`, `series`, `sources[]` (`kind`, `ref`, `url`),',
  '`confidence` (' + ENUMS.confidence.join(', ') + ') et `attrs` (attributs techniques ci-dessous).',
  '',
  'Légende : **obligatoire** = signalé comme manquant s\'il est vide ; *conditionnel* = obligatoire selon un autre attribut.',
  '',
];
for (const [type, def] of Object.entries(PART_TYPES)) {
  lines.push(`## ${def.label} (\`${type}\`)`, '', '| Attribut | Description | Type | Statut |', '|---|---|---|---|');
  for (const [k, s] of Object.entries(def.attrs)) {
    const kind = s.kind === 'enum' ? `liste \`${s.enum}\`` : s.kind + (s.unit ? ` (${s.unit})` : '');
    const status = s.required ? '**obligatoire**' : s.requiredIf ? '*conditionnel*' : '';
    lines.push(`| \`${k}\` | ${s.label} | ${kind} | ${status} |`);
  }
  lines.push('');
}
lines.push('## Listes de valeurs', '');
for (const [name, values] of Object.entries(ENUMS)) lines.push(`- \`${name}\` : ${values.map((v) => `\`${v}\``).join(', ')}`);
lines.push('');
writeFileSync(new URL('../docs/SCHEMA.md', import.meta.url), lines.join('\n'));
