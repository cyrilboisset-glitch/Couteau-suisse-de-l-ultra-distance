// PIÈCES DE TEST — valeurs ILLUSTRATIVES, pas des données de la base.
// Elles reproduisent des situations typiques (route 11v, VTT 12v, gravel…)
// pour tester la logique du moteur. Les vraies références, sourcées, arrivent
// à l'étape 2 dans data/.
const SRC = [{ kind: 'officiel', ref: 'FIXTURE DE TEST (illustratif)' }];

export function part(type, id, attrs, extra = {}) {
  return { id, type, brand: 'Test', ref: id, discipline: 'route', sources: SRC, confidence: 'haute', ...extra, attrs };
}

// --- Transmission route 11v mécanique (famille de tirage « T-ROUTE-11 ») ---
export const rdRoute11 = part('rear_derailleur', 'RD-ROUTE11-GS', {
  speeds: 11, system: 'mecanique', family: 'T-ROUTE-11', maxCog: 34, minCog: 11,
  totalCapacity: 39, cageLength: 'GS', mount: 'standard', clutch: false, maxFrontChainrings: 2,
}, { generation: 'G1' });

export const rdRoute11Short = part('rear_derailleur', 'RD-ROUTE11-SS', {
  speeds: 11, system: 'mecanique', family: 'T-ROUTE-11', maxCog: 30, minCog: 11,
  totalCapacity: 33, cageLength: 'SS', mount: 'standard', clutch: false, maxFrontChainrings: 2,
}, { generation: 'G1' });

// Gravel 11v qui reprend le tirage route : même famille.
export const rdGravel11 = part('rear_derailleur', 'RD-GRAVEL11-1X', {
  speeds: 11, system: 'mecanique', family: 'T-ROUTE-11', maxCog: 42, minCog: 11,
  totalCapacity: 31, cageLength: 'long', mount: 'standard', clutch: true, maxFrontChainrings: 1,
}, { discipline: 'gravel', generation: 'G1' });

// VTT 11v avec un tirage différent du route.
export const rdVtt11 = part('rear_derailleur', 'RD-VTT11-SGS', {
  speeds: 11, system: 'mecanique', family: 'T-VTT-11', maxCog: 46, minCog: 11,
  totalCapacity: 47, cageLength: 'SGS', mount: 'standard', clutch: true, maxFrontChainrings: 2,
}, { discipline: 'vtt' });

// VTT 11v d'une famille documentée comme pilotable par une manette route (montage « mullet »).
export const rdVttMullet = part('rear_derailleur', 'RD-VTT11-MULLET', {
  speeds: 11, system: 'mecanique', family: 'T-VTT-11-B', maxCog: 42, minCog: 11,
  totalCapacity: 31, cageLength: 'long', mount: 'standard', clutch: true, maxFrontChainrings: 1,
}, { discipline: 'vtt' });

export const rdDi2 = part('rear_derailleur', 'RD-DI2-11', {
  speeds: 11, system: 'electronique', protocol: 'di2', family: 'T-DI2-11', maxCog: 34,
  totalCapacity: 39, mount: 'standard',
});

export const rdAxs = part('rear_derailleur', 'RD-AXS-12', {
  speeds: 12, system: 'electronique', protocol: 'axs', family: 'T-AXS', maxCog: 36,
  totalCapacity: 38, mount: 'standard',
});

export const rdUdhMech = part('rear_derailleur', 'RD-UDH-DIRECT', {
  speeds: 11, system: 'mecanique', family: 'T-ROUTE-11', maxCog: 34,
  totalCapacity: 39, mount: 'udh_direct',
});

export const shifterRoute11 = part('shifter', 'ST-ROUTE11', {
  side: 'les_deux', speeds: 11, system: 'mecanique', family: 'T-ROUTE-11', form: 'levier_route',
  brakeActuation: 'mecanique', cablePull: 'court',
});

export const shifterRoute11Hydro = part('shifter', 'ST-ROUTE11-HYDRO', {
  side: 'les_deux', speeds: 11, system: 'mecanique', family: 'T-ROUTE-11', form: 'levier_route',
  brakeActuation: 'hydraulique', fluid: 'mineral', hydraulicSystem: 'H-ROUTE',
});

export const shifter9 = part('shifter', 'SL-9V', {
  side: 'arriere', speeds: 9, system: 'mecanique', family: 'T-9', form: 'gachette_vtt',
}, { discipline: 'vtt', generation: 'ancienne' });

export const shifterAxs = part('shifter', 'ST-AXS', {
  side: 'les_deux', speeds: 12, system: 'electronique', protocol: 'axs', family: 'T-AXS', form: 'levier_route',
});

// --- Cassettes, roues, chaînes ---
export const cassette11_34 = part('cassette', 'CS-11-34', {
  kind: 'cassette', speeds: 11, minCog: 11, maxCog: 34, freehub: 'hg_11_route',
});
export const cassette11_36 = part('cassette', 'CS-11-36', {
  kind: 'cassette', speeds: 11, minCog: 11, maxCog: 36, freehub: 'hg_8_9_10',
});
export const cassette11_42 = part('cassette', 'CS-11-42', {
  kind: 'cassette', speeds: 11, minCog: 11, maxCog: 42, freehub: 'hg_8_9_10',
}, { discipline: 'vtt' });
export const cassette10_36 = part('cassette', 'CS-10-36', {
  kind: 'cassette', speeds: 10, minCog: 11, maxCog: 36, freehub: 'hg_8_9_10',
}, { discipline: 'vtt', generation: 'ancienne' });
export const cassetteXd = part('cassette', 'CS-XD-10-50', {
  kind: 'cassette', speeds: 12, minCog: 10, maxCog: 50, freehub: 'xd',
}, { discipline: 'vtt' });
export const freewheel7 = part('cassette', 'MF-7V', {
  kind: 'roue_libre', speeds: 7, minCog: 14, maxCog: 28, freewheelThread: 'BSA 1.37x24',
});

export const wheelHg11 = part('wheel', 'WH-HG11', { brakeInterface: 'disque', freehub: 'hg_11_route', rotorMount: 'centerlock' });
export const wheelHg = part('wheel', 'WH-HG', { brakeInterface: 'disque', freehub: 'hg_8_9_10', rotorMount: 'six_trous' });
export const wheelRim = part('wheel', 'WH-JANTE', { brakeInterface: 'jante', freehub: 'hg_11_route' });
export const wheelThreaded = part('wheel', 'WH-VISSER', { brakeInterface: 'jante', freewheelThread: 'BSA 1.37x24' });

export const chain9 = part('chain', 'CN-9', { speeds: 9, flattop: false, connection: 'maillon_rapide' });
export const chain10 = part('chain', 'CN-10', { speeds: 10, flattop: false, connection: 'maillon_rapide' });
export const chain11 = part('chain', 'CN-11', { speeds: 11, flattop: false, connection: 'maillon_rapide' });
export const chain12 = part('chain', 'CN-12', { speeds: 12, flattop: false, connection: 'maillon_rapide' });
export const chainFlattop = part('chain', 'CN-12-FLATTOP', { speeds: 12, flattop: true, connection: 'maillon_rapide' });

// --- Cadres ---
export const frameRoute = part('frame', 'FR-ROUTE', {
  bbShell: 'bsa', bbShellWidth: 68, rdHanger: 'standard', fdMount: 'braze_on', brakeMount: 'flat_mount',
});
export const frameUdh = part('frame', 'FR-UDH', { rdHanger: 'udh', brakeMount: 'flat_mount' });
export const frameRim = part('frame', 'FR-JANTE', { fdMount: 'collier_31_8', brakeMount: 'etrier_central' });

// --- Freins ---
export const caliperMineralFlat = part('brake_caliper', 'BR-MIN-FLAT', {
  brakeType: 'disque', brakeActuation: 'hydraulique', fluid: 'mineral', hydraulicSystem: 'H-ROUTE',
  mount: 'flat_mount', padShape: 'P-A',
});
export const caliperMineralPostVtt = part('brake_caliper', 'BR-MIN-POST-VTT', {
  brakeType: 'disque', brakeActuation: 'hydraulique', fluid: 'mineral', hydraulicSystem: 'H-VTT',
  mount: 'post_mount', padShape: 'P-B',
}, { discipline: 'vtt' });
export const caliperMineralFlatOther = part('brake_caliper', 'BR-MIN-FLAT-AUTRE', {
  brakeType: 'disque', brakeActuation: 'hydraulique', fluid: 'mineral', hydraulicSystem: 'H-AUTRE',
  mount: 'flat_mount', padShape: 'P-C',
});
export const caliperDotFlat = part('brake_caliper', 'BR-DOT-FLAT', {
  brakeType: 'disque', brakeActuation: 'hydraulique', fluid: 'dot', hydraulicSystem: 'H-DOT',
  mount: 'flat_mount', padShape: 'P-D',
});
export const caliperMechRoadDisc = part('brake_caliper', 'BR-MECA-DISQUE-ROUTE', {
  brakeType: 'disque', brakeActuation: 'mecanique', cablePull: 'court', mount: 'flat_mount', padShape: 'P-A',
});
export const vBrake = part('brake_caliper', 'BR-VBRAKE', {
  brakeType: 'jante', brakeActuation: 'mecanique', cablePull: 'long', mount: 'v_brake',
}, { discipline: 'vtt' });
export const rimCaliper = part('brake_caliper', 'BR-JANTE-ROUTE', {
  brakeType: 'jante', brakeActuation: 'mecanique', cablePull: 'court', mount: 'etrier_central',
});
export const leverHydroVtt = part('brake_lever', 'BL-HYDRO-VTT', {
  brakeActuation: 'hydraulique', fluid: 'mineral', hydraulicSystem: 'H-VTT',
}, { discipline: 'vtt' });
export const leverLongPull = part('brake_lever', 'BL-LONG', { brakeActuation: 'mecanique', cablePull: 'long' }, { discipline: 'vtt' });

export const rotorCenterlock = part('rotor', 'RT-CL-160', { mount: 'centerlock', diameter: 160, padCompat: 'resine_seulement' });
export const rotor6bolt = part('rotor', 'RT-6T-160', { mount: 'six_trous', diameter: 160, padCompat: 'resine_et_metal' });
export const rotor6bolt140 = part('rotor', 'RT-6T-140', { mount: 'six_trous', diameter: 140, padCompat: 'resine_et_metal' });
export const padsA = part('brake_pads', 'PAD-A-RESINE', { shape: 'P-A', compound: 'resine' });
export const padsAMetal = part('brake_pads', 'PAD-A-METAL', { shape: 'P-A', compound: 'metal' });
export const padsB = part('brake_pads', 'PAD-B', { shape: 'P-B', compound: 'resine' });

// --- Pédalier ---
export const crankRoute = part('crankset', 'FC-ROUTE-24', {
  speeds: 11, armLength: 172.5, spindle: 'shimano_24', ringInterface: 'bcd', bcd: 110, bolts: 4,
  chainrings: 2, teeth: '50-34', chainline: 43.5, shellWidths: '68',
});
export const crankGravelDub = part('crankset', 'FC-GRAVEL-DUB', {
  speeds: 12, armLength: 172.5, spindle: 'sram_dub', ringInterface: 'direct_mount', dmType: 'DM-8',
  chainrings: 1, teeth: '40', chainline: 47.5, shellWidths: '68', requiresFlattop: true,
}, { discipline: 'gravel' });
export const crankVttBoost = part('crankset', 'FC-VTT-BOOST', {
  spindle: 'shimano_24', ringInterface: 'direct_mount', dmType: 'DM-VTT', chainrings: 1, teeth: '32',
  chainline: 52, shellWidths: '73',
}, { discipline: 'vtt' });
export const crankTriple = part('crankset', 'FC-TRIPLE', {
  spindle: 'octalink_v1', ringInterface: 'bcd', bcd: 104, bolts: 4, chainrings: 3, teeth: '48-36-26',
}, { discipline: 'vtt', generation: 'ancienne' });
export const bbBsa24 = part('bottom_bracket', 'BB-BSA-24', { shell: 'bsa', shellWidth: 68, spindle: 'shimano_24' });
export const bbBsaDub = part('bottom_bracket', 'BB-BSA-DUB', { shell: 'bsa', shellWidth: 68, spindle: 'sram_dub' });
export const bbPf30 = part('bottom_bracket', 'BB-PF30-DUB', { shell: 'pf30', spindle: 'sram_dub' });
export const ring110 = part('chainring', 'CR-110-50', { teeth: 50, ringInterface: 'bcd', bcd: 110, bolts: 4 });
export const ring130 = part('chainring', 'CR-130-50', { teeth: 50, ringInterface: 'bcd', bcd: 130, bolts: 5 });
export const fdDouble = part('front_derailleur', 'FD-ROUTE-2X', {
  speeds: 11, chainrings: 2, system: 'mecanique', family: 'T-ROUTE-11', mount: 'braze_on', capacity: 16, maxRing: 53, minRing: 46,
});
export const fdClampDouble = part('front_derailleur', 'FD-COLLIER-2X', {
  speeds: 11, chainrings: 2, system: 'mecanique', family: 'T-ROUTE-11', mount: 'braze_on', capacity: 16,
});
