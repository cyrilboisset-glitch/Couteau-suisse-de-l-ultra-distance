# Trousse du baroudeur

Compatibilité de pièces vélo en cas de casse, en ultra-distance, **100 % hors ligne**.
Je tape la référence de la pièce cassée, l'appli liste les remplacements possibles,
toutes marques, disciplines et générations confondues, classés :

✅ 100 % officiel · 🟢 compatible connu · 🟠 DÉPANNAGE (avec la limitation) · ❌ incompatible (avec la raison)

## Principe

Compatibilité **par standards, jamais par listes** : chaque pièce est décrite par ses
attributs techniques ([docs/SCHEMA.md](docs/SCHEMA.md)) et un moteur de règles en
déduit la compatibilité ([docs/REGLES.md](docs/REGLES.md)). Chaque pièce et chaque
règle porte sa source ; ce qui n'est pas sourcé officiellement est « à valider ».

## Avancement

1. ✅ Schéma de données + moteur de règles + tests unitaires
2. 🟡 Base pilote : Shimano 11/12v, SRAM 12/13v, Campagnolo Ekar, microSHIFT, LTWOO, SENSAH, SunRace, Box — 158 pièces, à valider ([COUVERTURE](docs/COUVERTURE.md), [méthode](docs/DONNEES.md))
3. ⬜ Interface de recherche + résultats
4. ⬜ PWA hors ligne
5. ⬜ Extension 10 → 8 vitesses, Campagnolo, marques asiatiques
6. ⬜ Import CSV

## Structure

```
src/schema.js          types de pièces, attributs, listes de valeurs, validation
src/knowledge.js       base de connaissances par standards (familles, corps de roue libre…)
src/engine/rules/      règles : transmission, freins, pédalier
src/engine/core.js     checkPair (deux pièces), agrégation des niveaux
src/engine/replacement.js  checkReplacement, findReplacements, checkAvailable
data/                  base réelle (knowledge/ = standards, parts/ = pièces), voir docs/DONNEES.md
scripts/build-data.js  validation + dist/catalogue.json + docs/COUVERTURE.md
test/                  tests (pièces de test illustratives, pas des données réelles)
```

## Utilisation (moteur)

```js
import { createKnowledge, findReplacements, checkPair } from './src/index.js';

const kb = createKnowledge(knowledgeJson);
findReplacements(pieceCassee, catalogue, { kb });            // remplacements classés
findReplacements(pieceCassee, catalogue, { kb, bike: [...] }); // avec le reste du vélo
checkPair(manette, derailleur, kb);                           // deux pièces entre elles
```

## Tests

```
npm test          # Node ≥ 20, aucune dépendance
npm run build     # valide data/ et génère dist/catalogue.json
```
