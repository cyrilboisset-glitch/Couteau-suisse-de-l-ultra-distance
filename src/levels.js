// Niveaux de compatibilité. Plus le nombre est grand, pire c'est :
// le niveau d'un résultat est toujours le pire de ses constats.
export const LEVEL = Object.freeze({
  OFFICIAL: 1,
  KNOWN: 2,
  DEGRADED: 3,
  INCOMPATIBLE: 4,
});

export const LEVEL_INFO = Object.freeze({
  [LEVEL.OFFICIAL]: { key: 'officiel', emoji: '✅', label: '100 % – compatibilité officielle constructeur', color: '#2da44e' },
  [LEVEL.KNOWN]: { key: 'connu', emoji: '🟢', label: 'Compatible connu (hors doc officielle)', color: '#7ccf4f' },
  [LEVEL.DEGRADED]: { key: 'depannage', emoji: '🟠', label: 'DÉPANNAGE – mode dégradé', color: '#f08c00' },
  [LEVEL.INCOMPATIBLE]: { key: 'incompatible', emoji: '❌', label: 'Incompatible', color: '#d1242f' },
});

const BY_NAME = { officiel: LEVEL.OFFICIAL, connu: LEVEL.KNOWN, depannage: LEVEL.DEGRADED, incompatible: LEVEL.INCOMPATIBLE };

export function levelFromName(name) {
  const level = BY_NAME[name];
  if (!level) throw new Error(`Niveau de compatibilité inconnu : « ${name} »`);
  return level;
}

export const levelName = (level) => LEVEL_INFO[level].key;
