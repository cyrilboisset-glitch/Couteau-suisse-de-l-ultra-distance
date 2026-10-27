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
2. 🟡 Base : 5v à 13v (vintage à friction compris), groupes actuels et anciens (Dura-Ace 7700 → aujourd'hui, XTR / XT / Deore 9v → 12v, SRAM 1:1 / Exact Actuation / X-Actuation, Campagnolo 9v → 13v) — Shimano, SRAM, Campagnolo, SunTour / SR Suntour, Sachs, Simplex, Huret, Regina, Maillard / Atom, Dia-Compe, Stronglight, TA, Sugino, Mafac, Weinmann, Velo Orange, DNP, Magura, Avid, Hayes, Hope, Formula, microSHIFT, LTWOO, SENSAH, SunRace, Box, KMC, TRP — 591 pièces, à valider ([COUVERTURE](docs/COUVERTURE.md), [méthode](docs/DONNEES.md))
3. ✅ Interface : recherche tolérante + critères, navigation Marque → Gamme → Génération (année sourcée) → Type → Pièce, résultats par niveau, « sous la main », « mon vélo », mode sombre
3 ter. ✅ Interface en 5 langues (français, anglais, allemand, espagnol, italien) : textes de l'interface, verdicts du moteur et notes de la base traduits ; noms de pièces par glossaire technique ; recherche par mots-clés dans les 5 langues ([docs/TRADUCTION.md](docs/TRADUCTION.md))
3 bis. ✅ Mode Projet : pièce cible → pièces à garder / changer / ajouter / retirer, cascade, liste de courses, projets enregistrés ([docs/PROJET.md](docs/PROJET.md))
4. ⬜ PWA hors ligne
5. 🟡 Extension aux générations anciennes et autres marques (largement faite, voir [DONNEES](docs/DONNEES.md#générations-anciennes))
6. ⬜ Import CSV

## Structure

```
src/i18n/              traduction : tr() (catalogue + modèles de messages), glossaire des noms de pièces
i18n/*.json            traductions (clé = texte français), générées dans src/i18n/catalog.js
src/schema.js          types de pièces, attributs, listes de valeurs, validation
src/knowledge.js       base de connaissances par standards (familles, corps de roue libre…)
src/engine/rules/      règles : transmission, freins, pédalier
src/engine/core.js     checkPair (deux pièces), agrégation des niveaux
src/engine/replacement.js  checkReplacement, findReplacements, checkAvailable
src/search.js          recherche par référence (tolérante aux fautes) ou par critères
src/browse.js          navigation par arborescence (gammes et années : data/knowledge/gammes.json)
src/project.js         mode Projet : analyse d'une config + pièce cible, cascade, liste de courses
app/                   interface (HTML/CSS/JS sans dépendance)
scripts/build-www.js   assemble l'appli autonome dans dist/www/
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
npm run build     # valide data/, génère dist/catalogue.json et dist/www/
npm start         # build + serveur local : http://localhost:8080/
```
