// Gloria chapel layout in meters: x right (lattice side), y up, z toward the back. Numbers match plan.html.
export const H = 4.3;
export const ROOM = { x0: -4, x1: 4.05, zFront: -5.9, zBack: 6.6 };

export const LATTICE = {
  pts: [[-3.72, -5.12], [-1.7, -5.66], [0.6, -5.7], [2.55, -5.15], [3.7, -3.75], [4.02, -1.6], [4.05, 1.5], [4.05, 6.6]],
  y0: 0.32,
  y1: 4.06,
  pitch: 0.32,
  depth: 0.24,
  slotW: 0.185,
  gap: 0.085,
  patterns: [
    [0.62, 1.05, 0.62, 1.05],
    [1.05, 0.62, 1.05, 0.62],
    [0.6, 0.6, 0.92, 0.6, 0.6],
  ],
};

export const ARCH = { z: 0.55, w: 3.3, spring: 2.0, depth: 0.42 };

export const NAVE = { x0: -10.5, zMin: -3.6, zMax: 4.6, h: 7.4 };

export const DOME = { x: -0.55, z: -3.2, a: 2.0, b: 1.5, rim: 0.3, drum: 1.05, win: 0.46, cap: 0.5 };

export const ALTAR = {
  step: { z0: ROOM.zFront, z1: -3.55, h: 0.17 },
  mensa: { z: -4.25, w: 1.85, d: 0.82, h: 0.96 },
  retable: { z: -5.18, w: 1.22, h: 2.45, d: 0.34 },
  priest: { x: 0, z: -4.86 },
  server: { x: 1.45, z: -4.15 },
};

export const PEWS = { rows: 8, z0: -2.15, pitch: 0.96, left: [-3.42, -0.62], right: [0.62, 3.3] };

export const SEAT = { x: -0.9, row: 4 };

export const WALL = {
  band: 3.78,
  sconces: [{ z: 0.05, y: 3.0 }, { z: -3.05, y: 2.92 }],
  mosaic: { z: -1.2, y: 2.18, w: 0.62, h: 1.24 },
  plaques: [{ z: -0.55, y: 2.02, w: 0.5, h: 0.92 }, { z: -1.85, y: 2.02, w: 0.5, h: 0.92 }, { z: -1.2, y: 0.98, w: 0.46, h: 0.82 }],
  cross: { z: -2.42, y: 2.72 },
  door: { z: -2.78, w: 0.86, h: 2.08 },
  painting: { z: -3.42, y: 2.02, w: 0.56, h: 0.92 },
  station: { z: -3.62, y: 1.22, w: 0.32, h: 0.42 },
  pilaster: { z: -4.85, w: 0.5, d: 0.42 },
  tv: { x: -3.38, y: 3.32, z: -4.72, w: 1.05, h: 0.6, yaw: 0.72 },
  pipe: { z: 0.95 },
};

export const ITEMS = [
  [1, 'Lewa ściana z cegły', -4, 3.5],
  [2, 'Łuk do głównej nawy', -4, ARCH.z],
  [3, 'Kinkiety ze świecami', -4, WALL.sconces[0].z],
  [4, 'Mozaika Chrystusa z tablicami', -4, WALL.mosaic.z],
  [5, 'Krzyż z cegieł w reliefie', -4, WALL.cross.z],
  [6, 'Drzwi', -4, WALL.door.z],
  [7, 'Obraz i stacja w zielonej ramce', -4, WALL.painting.z],
  [8, 'Pilaster z telewizorem', -3.6, WALL.pilaster.z],
  [9, 'Ściana z kratownicy i mlecznego szkła', 4.05, 2.5],
  [10, 'Owalna kopuła z okienkami', DOME.x, DOME.z],
  [11, 'Ołtarz (mensa)', 0, ALTAR.mensa.z],
  [12, 'Ceglane retabulum: Czarna Madonna, papież, wota', 0, ALTAR.retable.z],
  [13, 'Ławki, 2 bloki po 8 rzędów', 1.95, 1.2],
  [14, 'Wejście z tyłu, tu zaczynasz (zgadnięte)', 0, ROOM.zBack],
];
