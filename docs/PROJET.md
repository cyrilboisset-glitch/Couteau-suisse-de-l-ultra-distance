# Mode Projet

« Je veux monter telle pièce : qu'est-ce qui reste compatible, que dois-je changer, quoi acheter ? »

## Entrées
- **Configuration actuelle** par emplacements : commandes, commande avant, dérailleurs arrière et avant, cassette, chaîne, pédalier, boîtier, leviers de frein, freins, disques, plaquettes. Chaque emplacement contient une pièce, « aucun / retiré » ou « je ne sais pas ».
  Chargement possible depuis « Mon vélo » ou d'un groupe (champ `generation` des données, pièces choisies compatibles entre elles).
- **Cadre et roue arrière** (hors catalogue, tout facultatif) : patte, fixation du dérailleur avant, coque de boîtier, fixations de frein, disque max, longueur de base, corps de roue libre, freinage des roues, fixation des disques.
- **Pièce cible.**

## Moteur (`src/project.js`)
1. La cible prend sa place ; toutes les paires et les règles d'ensemble (capacité, pignon max selon plateaux) sont évaluées.
2. Exigences : dérailleur avant et commande avant si 2 plateaux ou plus (sinon à retirer), disques si frein à disque, leviers de frein si les commandes n'en ont pas.
3. Cascade : les emplacements en conflit avec la cible changent ; si aucun candidat ne convient avec le reste, les emplacements qui bloquent les meilleurs candidats entrent à leur tour dans la cascade (6 tours max). Recherche par retour arrière, candidats classés par marque / génération.
4. Sans solution complète : solution partielle cohérente, emplacements « introuvable » signalés.
5. Conflit avec le cadre ou la roue : signalé à part (à adapter ou remplacer, hors catalogue).
6. Seuil : ✅ et 🟢 acceptés ; un 🟠 dépannage est traité comme « à changer » (un projet est un achat réfléchi).
7. Une donnée manquante n'impose jamais un changement : elle devient un ⚠️ « à vérifier ».

## Sorties
- par emplacement : ✅ rien à faire, ❌ à changer (raison + remplaçants filtrés, choix d'un autre remplaçant), ➕ à ajouter, ➖ à retirer, ⚠️ à vérifier / mesurer, 💡 recommandé ;
- liste de courses à cocher (pièces + pièces en plus : entretoises, adaptateurs…), travaux et réglages, outils ;
- longueur de chaîne calculée avec les coefficients de `data/knowledge/projet.json` et la longueur de base saisie ;
- « Moins de changements avec… » : pièces du même type que la cible compatibles avec la config actuelle ;
- incompatibilités déjà présentes dans la config saisie.

## Scénarios testés (`test/projet.test.js`)
1. Cassette 11-25 → 11-34 sur route 11v à chape courte (11-26 absente de la base).
2. 2x → 1x.
3. 10v → 11v.
4. Dérailleur VTT sur transmission route.
5. Cassette SRAM 10-36 XDR sur roue Shimano HG.
6. Patins → disques hydrauliques.
7. Pédalier aux plateaux plus petits (et plateau trop grand pour le dérailleur avant).

## Limites connues
- Pas encore de manettes VTT 11v Shimano, de dérailleur avant SRAM / AXS, de corps de roue libre par moyeu dans la base : la cascade le signale (« introuvable »).
- Freins avant et arrière traités comme identiques.
- Projets stockés dans le navigateur du téléphone : « Copier le projet » / « Importer » pour les sauvegarder ailleurs.

## Type de vélo

Le projet porte un type de vélo : route, gravel ou VTT (facultatif). Il ne filtre rien,
il **trie** : la liste « charger un groupe » est rangée par discipline (celle du vélo
d'abord ; pour un gravel, puis route et VTT), les recherches de pièces et les remplaçants
proposés font passer les pièces de la même discipline en premier, et le moteur choisit
d'abord une pièce de cette discipline quand plusieurs conviennent (`disciplineRank`).
