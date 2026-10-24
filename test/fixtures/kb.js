// BASE DE CONNAISSANCES DE TEST — entrées ILLUSTRATIVES pour tester le moteur.
import { createKnowledge } from '../../src/knowledge.js';

const TEST = (ref) => ({ kind: 'officiel', ref: `FIXTURE DE TEST : ${ref}` });

export const kb = createKnowledge({
  actuation: [
    {
      // Montage « mullet » documenté : manette route pilotant un dérailleur VTT d'une famille donnée.
      shifterFamily: 'T-ROUTE-11', derailleurFamily: 'T-VTT-11-B', side: 'arriere', level: 'officiel',
      message: 'Montage mixte route / VTT documenté par le constructeur.',
      source: TEST('montage mixte'), confidence: 'haute', status: 'valide',
    },
    {
      // Croisement de dépannage non officiel.
      shifterFamily: 'T-9', derailleurFamily: 'T-ROUTE-11', side: 'arriere', level: 'depannage',
      message: 'Manette 9v sur dérailleur route 11v.',
      limitation: 'Indexation approximative : quelques vitesses seulement.',
      source: { kind: 'communaute', ref: 'retour terrain (test)' }, confidence: 'basse', status: 'a_valider',
    },
  ],
  freehubFits: [
    {
      cassette: 'hg_8_9_10', body: 'hg_11_route', spacerMm: 1.85, level: 'officiel',
      message: 'Cassette HG 8/9/10 sur corps HG 11 route avec entretoise.',
      source: TEST('entretoise'), confidence: 'haute', status: 'valide',
    },
  ],
  hydraulic: [
    {
      leverSystem: 'H-ROUTE', caliperSystem: 'H-VTT', level: 'officiel',
      message: 'Levier route hydraulique avec étrier VTT du même constructeur.',
      source: TEST('route + VTT'), confidence: 'haute', status: 'valide',
    },
  ],
  brakeMountAdapters: [
    {
      caliperMount: 'post_mount', frameMount: 'is', level: 'officiel', adapter: 'Adaptateur IS → post mount',
      message: 'Étrier post mount sur cadre IS via adaptateur.',
      source: TEST('adaptateur'), confidence: 'haute', status: 'valide',
    },
  ],
});
