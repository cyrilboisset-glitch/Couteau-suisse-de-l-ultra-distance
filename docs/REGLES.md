# Règles du moteur

Le moteur ne contient **aucune** liste « pièce A ↔ pièce B ». Chaque règle compare
des attributs normalisés (voir [SCHEMA.md](SCHEMA.md)) ou consulte la base de
connaissances **par standards** (`data/knowledge.json` : familles de tirage,
corps de roue libre, systèmes hydrauliques, adaptateurs).

## Principes

- **Niveau d'un résultat = le pire de ses constats.** ✅ 1 → 🟢 2 → 🟠 3 → ❌ 4.
- **✅ 100 % exige des données sourcées constructeur.** Si une pièce impliquée n'a
  pas de source `officiel`, le résultat est plafonné à 🟢 et marqué « à valider ».
- **Toute compatibilité 🟢 ou 🟠 non sourcée officiellement est « à valider ».**
- **Rien n'est supposé.** Un couple de familles ou de standards absent de la base
  est ❌ (« aucune compatibilité documentée »), jamais ✅ par défaut.
- **Donnée manquante** sur une pièce : le constat le dit et liste le champ. Pour une
  règle absolue, le résultat est ❌ « vérification impossible » (on ne garantit pas
  un frein dont on ne connaît pas le fluide).
- **La discipline ne bloque jamais.** Elle sert seulement à départager deux
  résultats de même niveau et à expliquer ce qui change (« pièce VTT à la place
  d'une pièce route : … »).
- **Remplacement sans connaître le vélo** : le moteur déduit de la pièce cassée
  des voisins « virtuels » (la manette, la cassette, le cadre qui marchaient avec
  elle). Ce qu'il ne peut pas vérifier devient une **condition** affichée
  (« votre plus grand pignon doit faire 30 dents au plus »). Si l'utilisateur
  décrit son vélo, les conditions deviennent des verdicts.

## Règles d'exclusion absolues — À VALIDER PAR TOI

Jamais proposées en dépannage. Celles que tu as demandées :

| # | Règle | Id moteur |
|---|---|---|
| A1 | Hydraulique ≠ mécanique (levier ↔ étrier / frein sur jante) | `freins.actionnement` |
| A2 | Fluide minéral ≠ DOT | `freins.fluide` |
| A3 | Commande électronique ≠ mécanique | `transmission.systeme` |
| A4 | Protocoles électroniques entre eux (Di2 ≠ AXS ≠ EPS) | `transmission.systeme` |
| A5 | Frein à disque ≠ frein sur jante (fixation cadre, roue, disque) | `freins.fixation`, `freins.roue`, `freins.etrier_disque` |
| A6 | Corps de roue libre incompatible (sans changer le corps / la roue) | `transmission.corps_roue_libre` |

Celles que j'ajoute — **à valider** :

| # | Règle proposée | Pourquoi | Id moteur |
|---|---|---|---|
| A7 | Roue libre à visser ≠ cassette sur corps de roue libre | Moyeu différent : il faut changer la roue | `transmission.corps_roue_libre` |
| A8 | Freins mécaniques : tirage court (route, cantilever, disque méca route) ≠ tirage long (V-brake, disque méca VTT) | Court→long : les patins touchent à peine ; long→court : blocage. Dangereux dans les deux sens. Un adaptateur de tirage pourrait en faire un 🟢 *si sourcé*. | `freins.tirage_cable` |
| A9 | Forme de plaquette / patin différente de celle de l'étrier | Ne se monte pas | `freins.forme_plaquette` |
| A10 | Disque Center Lock sur moyeu 6 trous | Pas de trous de vis (l'inverse est possible par adaptateur → 🟢) | `freins.fixation_disque` |
| A11 | Standard d'axe de pédalier ≠ boîtier (DUB dans un boîtier 24 mm, etc.) | Diamètre / profil d'axe. Pour un remplacement sans connaître le boîtier, le moteur propose « + boîtier adapté » | `pedalier.axe` |
| A12 | Standard de coque ≠ boîtier (BSA, ITA, PF30, T47…) | Filetage (pas, sens) ou diamètre d'emboîtement | `pedalier.coque` |
| A13 | Interface plateau ≠ manivelle (BCD ou nombre de vis différents, direct mount différent) | Ne se fixe pas | `pedalier.interface_plateau` |
| A14 | Dérailleur à montage direct UDH (type SRAM Transmission) sans cadre UDH | Se fixe sur l'axe de roue du cadre UDH | `transmission.patte` |

Proposées mais **pas encore codées** (dis-moi si tu les veux) :

- A15 Disque plus grand que le maximum autorisé par le cadre / la fourche (sécurité).
- A16 Maillon rapide d'un autre nombre de vitesses que la chaîne.
- A17 Axe de roue : serrage rapide ≠ axe traversant, et largeurs d'axe (100/110/135/142/148) — utile pour « j'ai une roue sous la main ».
- A18 Batterie / câblage électronique d'une autre génération (ex. Di2 filaire ≠ semi-sans-fil) — aujourd'hui traité par la famille d'actionnement.

## Règles non absolues (niveau calculé)

| Id | Règle | Comportement |
|---|---|---|
| `transmission.famille` | Famille d'actionnement manette ↔ dérailleur | Même famille → ✅ ; couple présent dans la base → niveau de la base (ex. mullet officiel ✅, croisement terrain 🟠) ; sinon ❌ avec explication du croisement de disciplines |
| `transmission.vitesses_manette_cassette` | Crans de manette ↔ pignons (mécanique) | Différent → 🟠 « passe N vitesses sur M », réglage tension |
| `transmission.vitesses_electronique` | Dérailleur électronique ↔ pignons | Différent → 🟠 |
| `transmission.plus_grand_pignon` | Plus grand pignon ↔ max du dérailleur | ≤ → ✅ ; +1 à +2 dents → 🟠 vis B au max ; au-delà → ❌. **Tolérance de 2 dents générique, à valider par dérailleur** |
| `transmission.capacite_totale` | Capacité requise (avec cassette + pédalier connus) | Dépassée → 🟠 « éviter les croisements » |
| `transmission.largeur_chaine` | Chaîne ↔ cassette | Égal ✅ ; chaîne plus étroite d'un cran 🟢 ; de deux crans ou plus 🟠 ; plus large d'un cran 🟠 ; de deux crans ou plus ❌. **Tout à valider** |
| `transmission.flattop` | Chaîne Flattop ↔ plateaux | Exigence non respectée → ❌ |
| `transmission.fixation_avant` | Dérailleur avant ↔ cadre | Braze-on sur tube rond → 🟢 + collier ; collier plus grand → 🟢 + cale ; sinon ❌ |
| `transmission.avant_pedalier` | Dérailleur avant ↔ plateaux | Double/triple croisés, capacité, taille du grand plateau → 🟠 |
| `freins.systeme_hydraulique` | Maître-cylindre ↔ étrier, même fluide | Même système ✅ ; couple documenté → niveau de la base ; sinon 🟠 (course / puissance modifiées) ; toujours : purge + raccords |
| `freins.compose` | Plaquettes métal sur disque « résine seulement » | 🟠 usure rapide du disque |
| `pedalier.largeur_coque` | Longueur d'axe ↔ largeur de coque | Hors liste → ❌ |
| `pedalier.ligne_chaine` | Ligne de chaîne du pédalier de remplacement | Écart ≥ 5 mm → 🟠 (seuil à valider), sinon simple note |

## Base de connaissances : ce qui reste à sourcer (étape 2)

Toutes les tables de `data/knowledge.json` sont vides. Rien ne sera ajouté sans
source constructeur (ou marqué `a_valider`). Exemples de faits à vérifier sur les
docs officielles avant de les saisir :

- familles de tirage Shimano route 11v / VTT 11v / GRX 11v, route 12v / VTT 12v / GRX 12v ;
- familles SRAM (mécanique Exact Actuation / Eagle, AXS) et croisements route ↔ XPLR ↔ Eagle (mullet) ;
- corps de roue libre : HG 8/9/10 vs HG 11 route (entretoise), HG L2, Microspline, XD / XDR (entretoise) ;
- systèmes hydrauliques Shimano / SRAM route ↔ VTT.
