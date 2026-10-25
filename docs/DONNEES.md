# Données : format, méthode, fiabilité

## Organisation

```
data/knowledge/transmission.json  familles de tirage, croisements entre familles, corps de roue libre, pas de pignons
data/knowledge/freins.json        fluides miscibles, adaptateurs de fixation
data/knowledge/pedalier.json      croisements d'axes (vide : rien de sourcé)
data/parts/*.json                 pièces, par marque / catégorie
```

Chaque fichier contient un dictionnaire `sources` ; chaque pièce ou entrée y renvoie
par `src` (une clé ou une liste). `node scripts/build-data.js` valide tout (schéma,
sources avec URL, statuts, familles connues, identifiants uniques), produit
`dist/catalogue.json` et régénère [COUVERTURE.md](COUVERTURE.md) (pièces et champs
manquants). Le test `test/donnees-reelles.test.js` échoue si la base est invalide.

## Types de source

| `kind` | Signification | Effet |
|---|---|---|
| `officiel` | page, manuel ou tableau du constructeur | seul type qui permet le niveau ✅ |
| `revendeur` | fiche revendeur reprenant la fiche constructeur | plafonne à 🟢 |
| `presse` | essai, article technique | plafonne à 🟢 |
| `communaute` | forum, retour terrain | plafonne à 🟢, souvent 🟠 |
| `physique` | conséquence directe d'un principe mécanique | règles du moteur |

## Statut

- `valide` : valeur lue sur une page constructeur **et** cohérente avec au moins une autre source.
- `a_valider` : tout le reste. Le résultat affiché est marqué « à valider ».

## Méthode utilisée pour la base pilote (et sa limite)

Les pages ont été trouvées par moteur de recherche. **L'ouverture directe des pages
(et des PDF constructeur) était bloquée par la politique réseau de l'environnement** :
les valeurs ont été lues dans les extraits renvoyés par la recherche, pas dans le
document complet. C'est pourquoi presque tout est `a_valider`, y compris certaines
valeurs issues de pages officielles.

Règles appliquées :
- une valeur non trouvée reste **vide** (signalée dans COUVERTURE.md) ;
- deux sources contradictoires → champ vide + note (ex. capacité RD-R9250 : 35T ou 37T) ;
- une déduction est toujours écrite dans `notes` (ex. famille de tirage d'un dérailleur microSHIFT déduite de « Shimano compatible ») ;
- aucune compatibilité entre familles n'est supposée : sans entrée sourcée, le moteur répond ❌ « non documenté ».

## Générations anciennes

Fichiers `data/parts/*-anciens.json` (route Shimano, VTT Shimano, SRAM, Campagnolo,
chaînes et freins). Standards ajoutés dans `data/knowledge/transmission.json` :

- corps de roue libre Shimano 7v (`hg_7`) : cassette 7v sur corps 8/9/10v avec entretoise de 4 mm (🟢) ; cassette 8-10v sur corps 7v impossible (❌) ;
- corps Campagnolo 8v Exa-Drive (`campagnolo_8`) : cassette 8v sur corps 9/10/11v = 🟠 (entretoise ≈2,5 mm, sources contradictoires) ;
- famille `campagnolo-8-9-ancien` (leviers et dérailleurs d'avant 2001) ↔ Campagnolo 9/10v récent : 🟠 ;
- SRAM 1:1 (7/8/9v) ↔ Exact Actuation (10v) ↔ X-Actuation (VTT 11v) : ❌ ;
- route Shimano 11v : 9000, 6800, 5800 rangés dans la même famille que R9100 / R8000 / R7000.

Ajouts suivants :

- familles `suntour-accushift` (↔ Shimano 7/8v : 🟠 essai-erreur) et `sachs-2-1` (Sachs non ESP ↔ Shimano 7/8/9v : 🟢) ;
- Ergopower Campagnolo 8v / 9v séparés avant 2001 (`campagnolo-8-9-ancien`) et à partir de 2001 (`campagnolo-10`) ;
- huiles minérales de marques différentes (Shimano, Magura, Formula) : 🟠 dépannage d'urgence, purge complète au retour ; DOT ↔ minéral reste une exclusion absolue ;
- manettes avant VTT 9v / 10v, Hayes, Hope, Formula, références 6/7v (Tourney, roues libres, cassettes HG200-7, chaînes KMC Z).

Limites connues : beaucoup de pignons max, capacités, fixations de frein et normes DOT
exactes non trouvés (champ vide : la pièce reste proposée dans « remplaçants non
vérifiables ») ; tirage des étriers route Shimano « SLR » / « nouveau Super SLR » non
distingué par le moteur (signalé en note) ; les tirages SunTour varient selon les années.

## Vintage (5v / 6v)

- famille `friction` : une manette à friction (sans crans) déplace tout dérailleur mécanique, quel que soit le nombre de pignons (🟢, avec la condition « course de câble suffisante ») ; un dérailleur d'avant l'indexation avec une manette indexée = 🟠 ;
- en mode Projet, une manette indexée n'est jamais remplacée d'office par une friction (elle reste dans « Autres remplaçants ») ;
- filetages de roue libre : anglais / ISO ↔ italien = 🟢 avec limitation (angle de filet) ; français ↔ autres = ❌ ;
- coques de boîtier françaises et suisses, axe à clavettes, corps Uniglide (cassette Hyperglide refusée) ;
- familles `shimano-6` (SIS 1984) et `shimano-da7400` (manettes 7400 : autre dérailleur = 🟠, mode friction).

- portée des étriers sur jante (`reachMin` / `reachMax`) comparée à la portée du cadre (`brakeReach`, à saisir dans le mode Projet) ; étriers longue portée actuels (Tektro R559 55-73, BR-R650 47-57) pour les cadres anciens ;
- boîtier sans filetage (serrage) = dépannage 🟠 pour une coque au filetage abîmé ou inconnu ; boîtier français actuel (Velo Orange) ;
- pédaliers BCD 50,4 / 122 / 144 (TA, Stronglight, Sugino, Campagnolo), roues libres actuelles 6/7/8v (SunRace, DNP), chaînes 5/6v.

Limite : peu de capacités et pignons max publiés pour ces pièces (beaucoup de valeurs de forums ou d'annonces, confiance basse).

## Documents officiels à ouvrir pour valider en masse

- Shimano, tableau de compatibilité 2026-2027 : https://productinfo.shimano.com/pdfs/product/thisyear/2026-2027_Compatibility_v026_en.pdf
- Shimano, manuel de spécifications 2026-2027 : https://productinfo.shimano.com/pdfs/product/thisyear/2026-2027_Specifications_v028_en.pdf
- SRAM, carte de compatibilité route 2024+ : https://www.sram.com/globalassets/document-hierarchy/compatibility-map/road/road-compatibility-map-2024.pdf
- SRAM, carte AXS : https://www.sram.com/globalassets/document-hierarchy/compatibility-map/road/axs-components-compatibility-map.pdf
- SRAM, leviers / étriers hydrauliques route et VTT : https://www.sram.com/globalassets/document-hierarchy/compatibility-map/mtb-and-road-hydraulic-disc-brake-lever-and-caliper-compatibility.pdf
- SRAM, boîtiers DUB VTT : https://www.sram.com/globalassets/document-hierarchy/compatibility-map/mtb/dub-mtb-bottom-bracket-compatibility-chart.pdf
