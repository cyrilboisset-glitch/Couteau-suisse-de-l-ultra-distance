import { ok, incompatible, physique } from '../finding.js';

const has = (p, k) => p.attrs?.[k] !== undefined && p.attrs?.[k] !== null && p.attrs?.[k] !== '';

export const axeRoue = {
  id: 'roues.axe',
  label: 'Axe de roue ↔ pattes du cadre / de la fourche',
  between: [['wheel', 'frame']],
  absolute: true,
  confidence: 'haute',
  source: physique("Type d'axe, diamètre et largeur entre pattes doivent correspondre pour que la roue tienne et soit centrée."),
  evaluate(wheel, frame) {
    const out = [];
    const both = (k) => has(wheel, k) && has(frame, k);
    if (both('axleType') && wheel.attrs.axleType !== frame.attrs.axleType) {
      out.push(incompatible(this, `Roue à ${wheel.attrs.axleType.replace('_', ' ')} sur cadre à ${frame.attrs.axleType.replace('_', ' ')}. Certains moyeux se convertissent par embouts : vérifier le moyeu.`));
    } else if (both('axleDiameter') && wheel.attrs.axleDiameter !== frame.attrs.axleDiameter) {
      out.push(incompatible(this, `Axe de ${wheel.attrs.axleDiameter} mm pour des pattes de ${frame.attrs.axleDiameter} mm. Certains moyeux se convertissent par embouts : vérifier le moyeu.`));
    }
    if (both('axleWidth') && wheel.attrs.axleWidth !== frame.attrs.axleWidth) {
      out.push(incompatible(this, `Moyeu de ${wheel.attrs.axleWidth} mm pour un écartement de ${frame.attrs.axleWidth} mm.`));
    }
    if (!out.length && (both('axleType') || both('axleWidth'))) out.push(ok(this, 'Axe de roue adapté.'));
    return out;
  },
};

export const ROUES_RULES = [axeRoue];
