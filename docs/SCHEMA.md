# Schéma des pièces

> Fichier généré par `node scripts/schema-doc.js` à partir de `src/schema.js` — ne pas éditer à la main.

Champs communs à toutes les pièces : `id`, `type`, `brand`, `ref`, `aliases` (fautes / variantes de saisie),
`discipline` (route, gravel, vtt, autre), `generation`, `series`, `sources[]` (`kind`, `ref`, `url`),
`confidence` (haute, moyenne, basse) et `attrs` (attributs techniques ci-dessous).

Légende : **obligatoire** = signalé comme manquant s'il est vide ; *conditionnel* = obligatoire selon un autre attribut.

## Dérailleur arrière (`rear_derailleur`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `speeds` | Nombre de vitesses | int | **obligatoire** |
| `system` | Commande (mécanique / électronique) | liste `shiftSystem` | **obligatoire** |
| `family` | Famille d'actionnement (ratio de tirage ou protocole + génération) | string | **obligatoire** |
| `protocol` | Protocole électronique | liste `protocol` | *conditionnel* |
| `maxCog` | Plus grand pignon max (meilleur cas, en général mono-plateau) | int (dents) | **obligatoire** |
| `maxCog2x` | Plus grand pignon max en double plateau | int (dents) |  |
| `maxCog3x` | Plus grand pignon max en triple plateau | int (dents) |  |
| `minCog` | Plus petit pignon min | int (dents) |  |
| `minLowCog` | Plus grand pignon minimum (chape prévue pour au moins…) | int (dents) |  |
| `maxFrontDiff` | Écart max entre plateaux | int (dents) |  |
| `chainTypes` | Types de chaîne acceptés, séparés par « | » | string |  |
| `totalCapacity` | Capacité totale | int (dents) | **obligatoire** |
| `cageLength` | Longueur de chape (SS, GS, SGS…) | string |  |
| `mount` | Fixation | liste `rdMount` | **obligatoire** |
| `clutch` | Embrayage (clutch) | bool |  |
| `maxFrontChainrings` | Nombre de plateaux max prévu (1, 2, 3) | int |  |

## Dérailleur avant (`front_derailleur`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `speeds` | Vitesses arrière de la transmission | int | **obligatoire** |
| `chainrings` | Nombre de plateaux (2 ou 3) | int | **obligatoire** |
| `system` | Commande (mécanique / électronique) | liste `shiftSystem` | **obligatoire** |
| `family` | Famille d'actionnement (ratio de tirage ou protocole + génération) | string | **obligatoire** |
| `protocol` | Protocole électronique | liste `protocol` | *conditionnel* |
| `mount` | Fixation | liste `fdMount` | **obligatoire** |
| `capacity` | Capacité (écart plateaux) | int (dents) |  |
| `maxRing` | Grand plateau max | int (dents) |  |
| `minRing` | Grand plateau min | int (dents) |  |
| `chainline` | Ligne de chaîne prévue | number (mm) |  |

## Manette / levier de vitesses (`shifter`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `side` | Côté | liste `shifterSide` | **obligatoire** |
| `indexed` | Indexée (non = manette à friction, sans crans) | bool |  |
| `speeds` | Nombre de vitesses (arrière) ou de plateaux (avant) | int | *conditionnel* |
| `system` | Commande (mécanique / électronique) | liste `shiftSystem` | **obligatoire** |
| `family` | Famille d'actionnement (ratio de tirage ou protocole + génération) | string | **obligatoire** |
| `protocol` | Protocole électronique | liste `protocol` | *conditionnel* |
| `form` | Forme | liste `shifterForm` |  |
| `frontPositions` | Positions avant (2 ou 3 plateaux) | int |  |
| `brakeActuation` | Freinage hydraulique / mécanique | liste `brakeActuation` |  |
| `fluid` | Fluide (minéral / DOT) | liste `fluid` | *conditionnel* |
| `cablePull` | Tirage câble (court / long) | liste `cablePull` | *conditionnel* |
| `hydraulicSystem` | Système hydraulique (marque + famille de maître-cylindre) | string |  |
| `fluidSpec` | Fluide exact (ex. shimano_mineral, sram_maxima_mineral, magura_royal_blood, dot_5_1, dot_4) | string |  |

## Levier de frein (`brake_lever`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `form` | Forme | liste `shifterForm` |  |
| `brakeActuation` | Freinage hydraulique / mécanique | liste `brakeActuation` | **obligatoire** |
| `fluid` | Fluide (minéral / DOT) | liste `fluid` | *conditionnel* |
| `cablePull` | Tirage câble (court / long) | liste `cablePull` | *conditionnel* |
| `hydraulicSystem` | Système hydraulique (marque + famille de maître-cylindre) | string |  |
| `fluidSpec` | Fluide exact (ex. shimano_mineral, sram_maxima_mineral, magura_royal_blood, dot_5_1, dot_4) | string |  |

## Étrier / frein (`brake_caliper`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `brakeType` | Disque / jante | liste `brakeType` | **obligatoire** |
| `brakeActuation` | Freinage hydraulique / mécanique | liste `brakeActuation` | **obligatoire** |
| `fluid` | Fluide (minéral / DOT) | liste `fluid` | *conditionnel* |
| `cablePull` | Tirage câble (court / long) | liste `cablePull` | *conditionnel* |
| `hydraulicSystem` | Système hydraulique (marque + famille de maître-cylindre) | string |  |
| `fluidSpec` | Fluide exact (ex. shimano_mineral, sram_maxima_mineral, magura_royal_blood, dot_5_1, dot_4) | string |  |
| `mount` | Fixation | liste `brakeMount` | **obligatoire** |
| `padShape` | Forme / référence de plaquette ou patin | string |  |
| `reachMin` | Portée mini (étrier sur jante) | number (mm) |  |
| `reachMax` | Portée maxi (étrier sur jante) | number (mm) |  |

## Disque (`rotor`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `mount` | Fixation | liste `rotorMount` | **obligatoire** |
| `diameter` | Diamètre | int (mm) | **obligatoire** |
| `thickness` | Épaisseur | number (mm) |  |
| `padCompat` | Plaquettes admises | liste `rotorPadCompat` |  |

## Plaquettes / patins (`brake_pads`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `shape` | Forme / référence | string | **obligatoire** |
| `compound` | Composé | liste `padCompound` |  |

## Cassette / roue libre (`cassette`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `kind` | Cassette ou roue libre à visser | liste `cassetteKind` | **obligatoire** |
| `speeds` | Nombre de vitesses | int | **obligatoire** |
| `minCog` | Plus petit pignon | int (dents) | **obligatoire** |
| `maxCog` | Plus grand pignon | int (dents) | **obligatoire** |
| `freehub` | Standard de corps de roue libre | liste `freehub` | *conditionnel* |
| `freewheelThread` | Filetage (roue libre à visser) | liste `freewheelThread` | *conditionnel* |
| `cogs` | Étagement (ex. 11-12-13-14-16-18-20-22-25-28-32) | string |  |
| `pitch` | Famille de pas des pignons (ex. hg-11, shimano-12, sram-eagle-12) | string |  |
| `chainSpeeds` | Largeur de chaîne requise si différente du nombre de vitesses (ex. CUES) | int |  |
| `chainTypes` | Types de chaîne acceptés, séparés par « | » | string |  |
| `cogPitch` | Écartement des pignons | number (mm) |  |

## Chaîne (`chain`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `speeds` | Nombre de vitesses | int | **obligatoire** |
| `flattop` | Flattop | bool |  |
| `chainType` | Type de chaîne (ex. hg-12, sram-eagle, sram-flattop, sram-t-type, campagnolo-12) | string |  |
| `links` | Nombre de maillons à la vente | int |  |
| `connection` | Type d'attache | liste `chainConnection` |  |

## Pédalier (`crankset`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `speeds` | Vitesses prévues | int |  |
| `armLength` | Longueur de manivelle | number (mm) |  |
| `spindle` | Standard d'axe | liste `spindle` | **obligatoire** |
| `ringInterface` | Interface plateaux | liste `ringInterface` | **obligatoire** |
| `bcd` | BCD (entraxe de fixation) | number (mm) | *conditionnel* |
| `bolts` | Nombre de vis de plateau | int | *conditionnel* |
| `dmType` | Type de direct mount | string | *conditionnel* |
| `chainrings` | Nombre de plateaux (1, 2, 3) | int | **obligatoire** |
| `teeth` | Dentures (ex. 50-34) | string |  |
| `chainline` | Ligne de chaîne | number (mm) |  |
| `shellWidths` | Largeurs de boîtier admises, séparées par « | » (ex. 68|73) | string (mm) |  |
| `requiresFlattop` | Exige une chaîne Flattop | bool |  |
| `chainTypes` | Types de chaîne acceptés, séparés par « | » | string |  |
| `narrowWide` | Plateau à dents alternées (narrow-wide) | bool |  |

## Plateau (`chainring`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `teeth` | Nombre de dents | int | **obligatoire** |
| `ringInterface` | Interface | liste `ringInterface` | **obligatoire** |
| `bcd` | BCD | number (mm) | *conditionnel* |
| `bolts` | Nombre de vis | int | *conditionnel* |
| `dmType` | Type de direct mount | string | *conditionnel* |
| `speeds` | Vitesses prévues | int |  |
| `requiresFlattop` | Exige une chaîne Flattop | bool |  |
| `acceptsFlattop` | Accepte une chaîne Flattop | bool |  |
| `narrowWide` | Dents alternées (narrow-wide) | bool |  |
| `chainTypes` | Types de chaîne acceptés, séparés par « | » | string |  |
| `position` | Position (mono, grand, petit, milieu) | string |  |

## Boîtier de pédalier (`bottom_bracket`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `shell` | Standard de cadre (coque) | liste `bbShell` | **obligatoire** |
| `shellWidth` | Largeur de coque | number (mm) |  |
| `shellWidths` | Largeurs de coque admises, séparées par « | » (ex. 68|73|83) | string (mm) |  |
| `spindle` | Standard d'axe accepté | liste `spindle` | **obligatoire** |

## Roue / moyeu (`wheel`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `brakeInterface` | Freinage prévu (disque / jante) | liste `wheelBrake` | **obligatoire** |
| `freehub` | Corps de roue libre | liste `freehub` |  |
| `freewheelThread` | Filetage roue libre (moyeu à visser) | liste `freewheelThread` |  |
| `freehubOptions` | Autres corps de roue libre proposés pour ce moyeu, séparés par « | » | string |  |
| `rotorMount` | Fixation disque | liste `rotorMount` | *conditionnel* |
| `axleType` | Type d'axe de roue | liste `axleType` |  |
| `axleDiameter` | Diamètre d'axe (5 = serrage rapide, 12, 15, 20…) | number (mm) |  |
| `axleWidth` | Largeur entre pattes (100, 110, 130, 135, 142, 148…) | number (mm) |  |

## Cadre / fourche (`frame`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `bbShell` | Coque de boîtier | liste `bbShell` |  |
| `bbShellWidth` | Largeur de coque | number (mm) |  |
| `rdHanger` | Patte de dérailleur | liste `frameHanger` |  |
| `fdMount` | Fixation dérailleur avant | liste `fdMount` |  |
| `brakeReach` | Portée de frein nécessaire (centre du boulon → piste de la jante) | number (mm) |  |
| `brakeMount` | Fixation de frein | liste `brakeMount` |  |
| `maxRotor` | Diamètre de disque maximal autorisé | int (mm) |  |
| `chainstayLength` | Longueur de base (axe du pédalier → axe de roue) | number (mm) |  |
| `axleType` | Type d'axe de roue | liste `axleType` |  |
| `axleDiameter` | Diamètre d'axe (5 = serrage rapide, 12, 15, 20…) | number (mm) |  |
| `axleWidth` | Largeur entre pattes (100, 110, 130, 135, 142, 148…) | number (mm) |  |

## Maillon rapide (`quick_link`)

| Attribut | Description | Type | Statut |
|---|---|---|---|
| `speeds` | Nombre de vitesses | int | **obligatoire** |
| `flattop` | Flattop | bool |  |
| `reusable` | Réutilisable | bool |  |

## Listes de valeurs

- `discipline` : `route`, `gravel`, `vtt`, `autre`
- `shiftSystem` : `mecanique`, `electronique`
- `protocol` : `di2`, `axs`, `eps`, `autre`
- `shifterSide` : `arriere`, `avant`, `les_deux`
- `shifterForm` : `levier_route`, `gachette_vtt`, `poignee_tournante`, `bout_de_cintre`, `satellite`, `autre`
- `rdMount` : `standard`, `direct_mount`, `udh_direct`
- `frameHanger` : `standard`, `udh`, `direct_mount`
- `fdMount` : `collier_28_6`, `collier_31_8`, `collier_34_9`, `braze_on`, `direct_mount`, `e_type`, `autre`
- `cassetteKind` : `cassette`, `roue_libre`
- `freewheelThread` : `iso_anglais`, `italien`, `francais`, `autre`
- `freehub` : `uniglide`, `hg_7`, `hg_8_9_10`, `hg_11_route`, `hg_12_route`, `hg_l2`, `microspline`, `xd`, `xdr`, `n3w`, `campagnolo`, `campagnolo_8`, `autre`
- `chainConnection` : `maillon_rapide`, `goupille`
- `spindle` : `carre_jis`, `carre_iso`, `octalink_v1`, `octalink_v2`, `isis`, `shimano_24`, `sram_gxp`, `sram_dub`, `axe_30`, `campagnolo_ultratorque`, `campagnolo_powertorque`, `clavette`, `autre`
- `bbShell` : `bsa`, `ita`, `francais`, `suisse`, `sans_filetage`, `bb86`, `bb92`, `bb30`, `pf30`, `bb386evo`, `bbright`, `t47_externe`, `t47_interne`, `autre`
- `ringInterface` : `bcd`, `direct_mount`
- `brakeType` : `disque`, `jante`
- `brakeActuation` : `hydraulique`, `mecanique`
- `fluid` : `mineral`, `dot`
- `cablePull` : `court`, `long`
- `brakeMount` : `flat_mount`, `post_mount`, `is`, `etrier_central`, `direct_mount_jante`, `cantilever`, `v_brake`
- `wheelBrake` : `disque`, `jante`, `les_deux`
- `rotorMount` : `six_trous`, `centerlock`
- `axleType` : `serrage_rapide`, `axe_traversant`, `ecrous`, `autre`
- `padCompound` : `resine`, `metal`, `semi_metal`
- `rotorPadCompat` : `resine_seulement`, `resine_et_metal`
- `confidence` : `haute`, `moyenne`, `basse`
- `sourceKind` : `officiel`, `revendeur`, `presse`, `communaute`, `physique`, `a_sourcer`
- `status` : `valide`, `a_valider`
