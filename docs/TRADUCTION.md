# Traduction

L'appli existe en français (langue source), anglais, allemand, espagnol et italien.
La langue suit celle du téléphone au premier lancement, puis le choix fait avec le
bouton drapeau (gardé sur le téléphone).

## Principe

- **Le texte français est la clé.** Le moteur et la base restent écrits en français ;
  la traduction se fait à l'affichage avec `tr(texte)` (`src/i18n/index.js`).
- **Messages construits par le moteur** (« Portée 39–49 mm, cadre 60 mm. ») : le
  catalogue contient le modèle « Portée {0}–{1} mm, cadre {2} mm. », reconnu par
  expression régulière ; les valeurs insérées sont traduites à leur tour. Un message
  de plusieurs phrases est traduit phrase par phrase.
- **Noms de pièces et de générations** : glossaire technique (`src/i18n/glossary.js`,
  « chape courte » → « short cage », « 11v » → « 11s » / « 11-fach »).
- **Sources** : les citations (titre de fiche, forum, revendeur) restent dans leur
  langue d'origine.
- **Recherche** : les mots-clés des critères sont reconnus dans les 5 langues
  (« rear derailleur », « Schaltwerk », « cambio », « deragliatore »…). En italien et
  en espagnol, « cambio » est le dérailleur arrière, « deragliatore » / « desviador »
  le dérailleur avant.

## Ajouter ou modifier un texte

```
node scripts/i18n.js keys    # liste les textes français et ce qui manque par langue
# compléter i18n/en.json, de.json, es.json, it.json (clé = texte français exact)
node scripts/i18n.js build   # régénère src/i18n/catalog.js (fait aussi par npm run build)
```

Le test `test/i18n.test.js` échoue si un texte n'a pas sa traduction dans les quatre
langues.
