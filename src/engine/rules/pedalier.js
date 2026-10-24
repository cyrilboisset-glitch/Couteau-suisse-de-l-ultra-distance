import { ok, incompatible, guard, fromEntry, physique, aSourcer } from '../finding.js';

export const axeBoitier = {
  id: 'pedalier.axe',
  label: "Axe de pédalier ↔ boîtier",
  between: [['crankset', 'bottom_bracket']],
  absolute: true,
  confidence: 'haute',
  source: physique("Le diamètre et le profil de l'axe doivent correspondre aux roulements du boîtier."),
  evaluate(crank, bb, kb) {
    const g = guard(this, [[crank, ['spindle']], [bb, ['spindle']]]);
    if (g) return g.finding;
    const c = crank.attrs.spindle;
    const b = bb.attrs.spindle;
    if (c === b) return ok(this, `Même standard d'axe (${c}).`);
    const entry = kb.spindleFit(c, b);
    if (entry) return fromEntry(this, entry);
    if (bb.virtual) {
      // Remplacement de pédalier : un autre boîtier peut exister pour le même cadre.
      return ok(this, `Axe ${c} (l'original était ${b}).`, {
        condition: `Il faut trouver un boîtier pour axe ${c} adapté à la coque de votre cadre.`,
        extraParts: [`Boîtier de pédalier pour axe ${c}`],
        tools: ['Outils de dépose / pose de boîtier adaptés'],
      });
    }
    return incompatible(this, `Axe ${c} dans un boîtier prévu pour ${b} : impossible sans changer le boîtier.`);
  },
};

export const coqueCadre = {
  id: 'pedalier.coque',
  label: 'Boîtier ↔ coque du cadre',
  between: [['bottom_bracket', 'frame']],
  absolute: true,
  confidence: 'haute',
  source: physique('Filetage (pas, sens, diamètre) ou diamètre d\'emboîtement propre à chaque standard de coque.'),
  evaluate(bb, frame) {
    const g = guard(this, [[bb, ['shell']], [frame, ['bbShell']]]);
    if (g) return g.finding;
    if (bb.attrs.shell !== frame.attrs.bbShell) {
      return incompatible(this, `Boîtier ${bb.attrs.shell} dans une coque ${frame.attrs.bbShell} : filetage ou diamètre différent.`);
    }
    if (bb.attrs.shellWidth && frame.attrs.bbShellWidth && bb.attrs.shellWidth !== frame.attrs.bbShellWidth) {
      return incompatible(this, `Boîtier pour coque de ${bb.attrs.shellWidth} mm, cadre de ${frame.attrs.bbShellWidth} mm.`, {
        absolute: false, source: aSourcer('Certains boîtiers acceptent plusieurs largeurs avec entretoises : renseigner la pièce'),
      });
    }
    return ok(this, 'Boîtier adapté à la coque.');
  },
};

export const largeurCoque = {
  id: 'pedalier.largeur_coque',
  label: 'Longueur d\'axe ↔ largeur de coque',
  between: [['crankset', 'frame']],
  confidence: 'moyenne',
  source: physique("Un axe trop court ne permet pas le serrage ; trop long, la manivelle ne se serre pas."),
  evaluate(crank, frame) {
    if (!crank.attrs?.shellWidths || !frame.attrs?.bbShellWidth) return null;
    const widths = String(crank.attrs.shellWidths).split('|').map(Number);
    if (widths.includes(frame.attrs.bbShellWidth)) return ok(this, `Axe prévu pour une coque de ${frame.attrs.bbShellWidth} mm.`);
    return incompatible(this, `Axe prévu pour ${widths.join(' / ')} mm, coque de ${frame.attrs.bbShellWidth} mm.`);
  },
};

export const interfacePlateau = {
  id: 'pedalier.interface_plateau',
  label: 'Interface plateau ↔ manivelle (BCD / direct mount)',
  between: [['crankset', 'chainring']],
  absolute: true,
  confidence: 'haute',
  source: physique('Le plateau se fixe sur un entraxe et un nombre de vis donnés, ou sur une interface direct mount propriétaire.'),
  evaluate(crank, ring) {
    const g = guard(this, [[crank, ['ringInterface']], [ring, ['ringInterface']]]);
    if (g) return g.finding;
    if (crank.attrs.ringInterface !== ring.attrs.ringInterface) {
      return incompatible(this, `Plateau ${ring.attrs.ringInterface === 'bcd' ? 'à vis (BCD)' : 'direct mount'} sur manivelle ${crank.attrs.ringInterface === 'bcd' ? 'à vis (BCD)' : 'direct mount'}.`);
    }
    if (crank.attrs.ringInterface === 'bcd') {
      const g2 = guard(this, [[crank, ['bcd', 'bolts']], [ring, ['bcd', 'bolts']]]);
      if (g2) return g2.finding;
      if (crank.attrs.bcd !== ring.attrs.bcd || crank.attrs.bolts !== ring.attrs.bolts) {
        return incompatible(this, `BCD ${ring.attrs.bcd} mm / ${ring.attrs.bolts} vis ≠ manivelle ${crank.attrs.bcd} mm / ${crank.attrs.bolts} vis.`);
      }
      return ok(this, `Même BCD (${crank.attrs.bcd} mm, ${crank.attrs.bolts} vis).`);
    }
    const g3 = guard(this, [[crank, ['dmType']], [ring, ['dmType']]]);
    if (g3) return g3.finding;
    if (crank.attrs.dmType !== ring.attrs.dmType) {
      return incompatible(this, `Direct mount ${ring.attrs.dmType} ≠ ${crank.attrs.dmType}.`);
    }
    return ok(this, `Même direct mount (${crank.attrs.dmType}).`);
  },
};

export const PEDALIER_RULES = [axeBoitier, coqueCadre, largeurCoque, interfacePlateau];
