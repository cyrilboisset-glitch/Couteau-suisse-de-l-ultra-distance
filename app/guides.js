// Conseils d'installation par type de pièce + liens vers les guides d'atelier et les notices.
// Les étapes sont générales : les couples de serrage et réglages précis viennent toujours
// de la notice du fabricant (lien « notice » de la pièce).
import { t } from './src/i18n/index.js';

const PT = (path, title) => ({ url: `https://www.parktool.com/${path}`, title });

// Guides d'atelier Park Tool (adresses vérifiées), par sujet.
const LINKS = {
  rdAdjust: PT('en-us/blog/repair-help/rear-derailleur-adjustment', 'Park Tool – Rear Derailleur Adjustment'),
  rdInstall: PT('en-us/blog/repair-help/rear-derailleur-removal-and-installation', 'Park Tool – Rear Derailleur Removal and Installation'),
  hanger: PT('en-int/blog/repair-help/rear-derailleur-hanger-alignment', 'Park Tool – Rear Derailleur Hanger Alignment'),
  fdAdjust: PT('en-us/blog/repair-help/front-derailleur-adjustment', 'Park Tool – Front Derailleur Adjustment'),
  housing: PT('en-int/blog/repair-help/cutting-and-sizing-cable-housing', 'Park Tool – How to Size and Install Shift Cable Housing'),
  di2: PT('en-us/blog/repair-help/di2-shimano-electronic-intelligent-system-installation', 'Park Tool – Di2 Shimano Installation'),
  bleedFlat: PT('en-us/blog/repair-help/shimano-hydraulic-brake-service-and-adjustment', 'Park Tool – How to Bleed Shimano Flat Bar Hydraulic Brakes'),
  bleedDrop: PT('en-us/blog/repair-help/brake-bleeding-for-shimano-drop-bar-hydraulic-brakes-using-the-bkm-1', 'Park Tool – How to Bleed Shimano Drop Bar Hydraulic Brakes'),
  pads: PT('en-us/blog/repair-help/disc-brake-pad-removal-installation', 'Park Tool – Disc Brake Pad Removal & Installation'),
  rotor: PT('en-int/blog/repair-help/disc-brake-rotor-removal-installation', 'Park Tool – Disc Brake Rotor Removal & Installation'),
  hydroAlign: PT('en-us/blog/repair-help/hydraulic-disc-brake-alignment', 'Park Tool – Hydraulic Disc Brake Alignment'),
  mechDisc: PT('en-us/blog/repair-help/mechanical-disc-brake-alignment', 'Park Tool – Mechanical Disc Brake Alignment'),
  vbrake: PT('en-us/blog/repair-help/linear-pull-brake-service', 'Park Tool – Linear Pull Brake Service'),
  dualPivot: PT('en-us/blog/repair-help/dual-pivot-brake-service', 'Park Tool – Dual Pivot Brake Service'),
  sidepull: PT('en-us/blog/repair-help/sidepull-brake-service', 'Park Tool – Side Pull Brake Service'),
  cantilever: PT('en-us/blog/repair-help/cantilever-smooth-post-brake-service', 'Park Tool – Cantilever Brake Service'),
  crankTwoPiece: PT('en-us/blog/repair-help/crank-removal-and-installation-two-piece-compression-slotted', 'Park Tool – Crank Removal and Installation: Two-Piece'),
  crankSelfExtract: PT('en-us/blog/repair-help/crank-removal-and-installation-self-extracting', 'Park Tool – Crank Removal and Installation: Self-Extracting'),
  bbTools: PT('en-int/blog/repair-help/bottom-bracket-tool-selection-threaded-and-thread-together', 'Park Tool – Bottom Bracket Tool Selection'),
  bbThreadTogether: PT('en-us/blog/repair-help/bottom-bracket-removal-installation-thread-together', 'Park Tool – Bottom Bracket: Thread-Together'),
  bbCupCone: PT('en-int/blog/repair-help/bottom-bracket-service-adjustable-cup-and-cone', 'Park Tool – Bottom Bracket: Adjustable Cup-and-Cone'),
  cassette: PT('en-us/blog/repair-help/cassette-removal-and-installation', 'Park Tool – Cassette Removal and Installation'),
  assembly: PT('en-us/blog/repair-help/new-bike-assembly', 'Park Tool – Complete Bike Assembly Checklist'),
};

// Portails de notices des fabricants (recherche par référence).
const MAKERS = {
  Shimano: { url: 'https://si.shimano.com/', title: 'Shimano – manuels revendeur et utilisateur (si.shimano.com)' },
  SRAM: { url: 'https://www.sram.com/en/service', title: 'SRAM – service et manuels' },
  Campagnolo: { url: 'https://www.campagnolo.com/', title: 'Campagnolo – documentation technique' },
};

const COMMON_END = 'Serrer chaque vis au couple indiqué dans la notice du fabricant (clé dynamométrique).';

const GUIDES = {
  rear_derailleur: {
    steps: [
      'Vérifier que la patte de dérailleur est droite (une patte tordue fausse tous les réglages).',
      'Fixer le dérailleur sur la patte, passer la chaîne dans la chape et vérifier sa longueur.',
      'Régler la butée haute (H), puis tendre et serrer le câble sur le plus petit pignon.',
      'Régler l\'indexation avec la molette, puis la butée basse (L) et la vis B (écart chape / grand pignon).',
      'Passer toutes les vitesses en pédalant ; vérifier que la chaîne ne tombe pas dans les rayons.',
    ],
    links: ['rdInstall', 'rdAdjust', 'hanger', 'housing'],
  },
  front_derailleur: {
    steps: [
      'Régler la hauteur : 1 à 2 mm entre les dents du grand plateau et la chape.',
      'Aligner la chape parallèlement au grand plateau.',
      'Régler la butée basse (L), tendre et serrer le câble, puis régler la butée haute (H).',
      'Affiner la tension du câble pour que la montée et la descente soient franches.',
    ],
    links: ['fdAdjust', 'housing'],
  },
  shifter: {
    steps: [
      'Monter la manette à une position confortable, sans serrer à fond.',
      'Couper les gaines à longueur (sans plier ni écraser) et poser des embouts.',
      'Installer le câble neuf, puis régler le dérailleur concerné (butées et indexation).',
      'Électronique : vérifier la compatibilité du protocole et charger la batterie avant montage.',
    ],
    links: ['housing', 'rdAdjust', 'fdAdjust', 'di2'],
  },
  brake_lever: {
    steps: [
      'Fixer le levier sur le cintre sans serrer à fond, puis régler la position et la garde.',
      'Hydraulique : raccorder la durite avec une olive et un insert neufs, adaptés à la durite.',
      'Purger le circuit avec le fluide prescrit par le fabricant (jamais minéral et DOT mélangés).',
      'Vérifier à l\'arrêt que le levier est ferme et ne touche pas le cintre.',
    ],
    links: ['bleedFlat', 'bleedDrop', 'hydroAlign'],
  },
  brake_caliper: {
    steps: [
      'Monter l\'étrier (avec l\'adaptateur nécessaire) sans serrer à fond.',
      'Disque : actionner le levier pour centrer l\'étrier sur le disque, puis serrer les vis en alternant.',
      'Jante : régler la hauteur et le pincement des patins, puis le centrage et la garde.',
      'Tester le freinage à l\'arrêt, puis à basse vitesse avant de rouler.',
    ],
    links: ['hydroAlign', 'mechDisc', 'dualPivot', 'vbrake', 'cantilever', 'sidepull'],
  },
  rotor: {
    steps: [
      'Vérifier le sens de rotation indiqué sur le disque.',
      '6 trous : vis propres avec frein-filet, serrage en étoile. Center Lock : bague de serrage sans graisse.',
      'Ne jamais toucher la piste de freinage avec les doigts ni avec de la graisse.',
      'Recentrer l\'étrier si les plaquettes frottent, puis roder les plaquettes.',
    ],
    links: ['rotor', 'hydroAlign'],
  },
  brake_pads: {
    steps: [
      'Repousser complètement les pistons avec un outil plat (jamais un objet pointu).',
      'Installer les plaquettes de la bonne forme avec leur ressort et la goupille de sécurité.',
      'Pomper le levier jusqu\'à ce que les plaquettes touchent le disque ; vérifier qu\'elles ne frottent pas.',
      'Roder les plaquettes neuves par une série de freinages progressifs.',
    ],
    links: ['pads', 'hydroAlign'],
  },
  cassette: {
    steps: [
      'Vérifier le corps de roue libre et les entretoises nécessaires (voir la compatibilité).',
      'Monter les pignons dans l\'ordre, en alignant la cannelure large.',
      'Serrer le contre-écrou avec l\'outil adapté.',
      'Contrôler le réglage du dérailleur arrière après le changement.',
    ],
    links: ['cassette', 'rdAdjust'],
  },
  chain: {
    steps: [
      'Choisir une chaîne du même nombre de vitesses (et de la même norme pour Flattop).',
      'Couper à la bonne longueur (voir la longueur calculée dans « Projet », ou la notice du dérailleur).',
      'Fermer avec un maillon rapide neuf ou une goupille neuve, dans le bon sens de montage.',
      'Vérifier que la chaîne passe sans point dur sur toutes les combinaisons.',
    ],
    links: ['rdAdjust', 'assembly'],
  },
  crankset: {
    steps: [
      'Vérifier que l\'axe du pédalier correspond au boîtier (24 mm, DUB, GXP…).',
      'Graisser l\'axe, engager la manivelle gauche à 180° de la droite.',
      'Mettre en précharge avec le capuchon, puis serrer les vis de pincement en alternant.',
      'Vérifier qu\'il n\'y a ni jeu ni point dur en tournant.',
    ],
    links: ['crankTwoPiece', 'crankSelfExtract', 'bbTools'],
  },
  chainring: {
    steps: [
      'Vérifier l\'interface (vis, montage direct) et le sens de montage (repère côté extérieur).',
      'Aligner le pion anti-chute de chaîne avec la manivelle.',
      'Serrer les vis de plateau en croix, puis régler le dérailleur avant.',
    ],
    links: ['fdAdjust', 'crankTwoPiece'],
  },
  bottom_bracket: {
    steps: [
      'Identifier le filetage ou le diamètre de la coque (BSA, ITA, BB86, PF30, T47…).',
      'Nettoyer la coque, graisser les filetages (ou frein-filet léger selon la notice).',
      'Visser dans le bon sens : côté transmission inversé en BSA, pas en ITA.',
      'Serrer avec l\'outil adapté ; contrôler l\'absence de jeu après pose du pédalier.',
    ],
    links: ['bbTools', 'bbThreadTogether', 'bbCupCone'],
  },
  wheel: {
    steps: [
      'Vérifier le type d\'axe et l\'écartement du cadre.',
      'Monter le disque ou la cassette avant de poser la roue.',
      'Serrer l\'axe ou le blocage rapide fermement ; vérifier que la roue est centrée.',
    ],
    links: ['cassette', 'rotor'],
  },
  quick_link: {
    steps: [
      'Utiliser un maillon du même nombre de vitesses que la chaîne.',
      'Respecter le sens de montage indiqué ; certains maillons ne sont pas réutilisables.',
      'Fermer en mettant la chaîne en tension (pédale bloquée ou pince à maillon).',
    ],
    links: ['assembly'],
  },
  frame: { steps: [], links: ['assembly'] },
};

/** Bloc « Installation » d'une pièce : conseils, guides d'atelier, notice du fabricant. */
export function guideHtml(part, esc) {
  const g = GUIDES[part.type];
  if (!g) return '';
  const steps = g.steps.length ? [...g.steps, COMMON_END] : [];
  const maker = MAKERS[part.brand];
  const links = [
    ...(maker ? [{ ...maker, title: t(maker.title), note: t('chercher « {0} »', part.ref) }] : []),
    ...g.links.map((k) => LINKS[k]),
  ];
  return `<details class="guide"><summary>🔧 ${t('Installation : conseils et guides')}</summary>
    ${steps.length ? `<ol>${steps.map((s) => `<li>${t(s)}</li>`).join('')}</ol>` : ''}
    <p class="small muted">${t('Conseils généraux : la notice du fabricant fait foi (couples, réglages, outils).')}</p>
    <ul class="guide-links">${links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>${l.note ? ` <span class="muted small">(${esc(l.note)})</span>` : ''}</li>`).join('')}</ul>
  </details>`;
}
