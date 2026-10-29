# Appli Android – de la compilation au Play Store

L'appli web est emballée avec **Capacitor** (dossier `android/`). La compilation se fait
sur **GitHub Actions** (`.github/workflows/android.yml`) : rien à installer sur votre ordinateur.

## Ce que contient l'APK

- Un seul fichier HTML minifié (`dist/mobile/index.html`), généré par `npm run build:mobile`.
- La base de pièces **compressée et chiffrée** (AES-GCM, nouvelle clé à chaque compilation),
  déchiffrée en mémoire au lancement (`app/vault.js`). Ce n'est pas inviolable, mais la base
  ne peut plus être copiée telle quelle depuis l'APK.
- Identifiant de l'appli : `com.groupsettoolbox.app` (définitif une fois publié sur le Play Store ;
  à changer **avant** le premier envoi si vous voulez un autre nom, dans `capacitor.config.json`
  et `android/app/build.gradle`).
- Nom sous l'icône : « Groupset Toolbox » (`android/app/src/main/res/values/strings.xml`).

## 1. Récupérer l'APK de test (à chaque envoi de code)

1. Sur GitHub : onglet **Actions** du dépôt → compilation **Android** la plus récente (coche verte).
2. En bas de la page, section **Artifacts** : télécharger `groupset-toolbox-test-…` (fichier zip).
3. Dézipper : le fichier `app-debug.apk` est l'appli.
4. Sur le téléphone Android : ouvrir l'APK, autoriser « Installer des applis inconnues » pour
   l'appli qui l'ouvre (Fichiers, Chrome…), puis **Installer**.

L'APK de test n'est pas signé pour le Play Store : il sert seulement à essayer l'appli.

## 2. Créer la clé de signature (une seule fois, à garder précieusement)

La clé prouve que les mises à jour viennent de vous. **Si elle est perdue, l'appli ne pourra plus
être mise à jour** (sauf avec la signature gérée par Google Play, voir plus bas). Ne la mettez
jamais dans le dépôt et ne la transmettez à personne.

Sur un ordinateur avec Java installé (ou Android Studio) :

```bash
keytool -genkeypair -v -keystore groupset-release.keystore -alias groupset \
  -keyalg RSA -keysize 4096 -validity 10000
```

Notez le mot de passe choisi, et sauvegardez `groupset-release.keystore` à deux endroits sûrs
(clé USB + coffre-fort de mots de passe, par exemple).

Puis convertissez-la en texte pour GitHub :

```bash
base64 -w0 groupset-release.keystore > keystore.txt     # Linux
base64 -i groupset-release.keystore -o keystore.txt     # macOS
```

## 3. Donner la clé à GitHub (secrets)

Dépôt GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** :

| Nom du secret | Valeur |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | tout le contenu de `keystore.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe du fichier de clé |
| `ANDROID_KEY_ALIAS` | `groupset` |
| `ANDROID_KEY_PASSWORD` | mot de passe de la clé (souvent le même) |

À la compilation suivante, une seconde archive apparaît : `groupset-toolbox-release-…`, avec
l'APK signé et le fichier **`.aab`** à envoyer au Play Store.

## 4. Play Console (votre compte)

1. Créer l'appli : nom « Groupset Compatibility Toolbox », langue par défaut français,
   « Application », « Payante » ou « Gratuite » (**gratuite + achats intégrés** pour le modèle
   freemium : ce choix ne peut plus revenir à « payante » ensuite).
2. **Signature d'application par Google Play** : accepter (recommandé). Votre clé devient la
   « clé d'importation » ; en cas de perte, Google peut la réinitialiser.
3. **Tests → Test interne** : créer une version, envoyer le `.aab`, ajouter vos testeurs.
4. Compléter les fiches demandées (je fournirai les textes) : fiche Play Store, icône
   `assets/icon-512.png`, captures, politique de confidentialité (`docs/CONDITIONS.md`,
   à mettre en ligne), sécurité des données (aucune donnée collectée), classification du contenu,
   public cible.
5. Compte personnel récent : test fermé avec 12 testeurs pendant 14 jours avant la production.

## Compiler sur son ordinateur (facultatif)

Android Studio + Node 22 :

```bash
npm ci
npm run build:mobile      # appli web → android/ (base chiffrée)
npx cap open android      # ouvre le projet dans Android Studio
```

Icônes et écrans de démarrage : `npm run icons` (régénère depuis `app/logo.js`).
