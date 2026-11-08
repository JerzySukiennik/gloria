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

export const PEWS = { rows: 8, z0: -2.15, pitch: 0.96, left: [-3.02, -0.62], right: [0.62, 3.3] };

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



export const HALL = { x0: -28.42, x1: -4.42, xc: -16.42, z0: -12.6, z1: 8.6, h: 8.6 };
export const APSE = [[-27.9, -9.3], [-25.0, -11.4], [-16.42, -12.25], [-7.84, -11.4], [-4.94, -9.3]];
export const STAGE = { x0: -25.2, x1: -7.64, z1: -6.6, h: 0.6 };
export const HALTAR = { x: -16.42, z: -8.9, w: 3.2, d: 1.1, h: 1.0 };
export const COLUMNS = [-6.4, -2.9, 4.0].flatMap((z) => [[-26.3, z], [-6.54, z]]);
export const HPEWS = { rows: 10, z0: -2.4, pitch: 0.96, left: [-25.2, -17.5], right: [-15.34, -7.64] };
export const PIT = { x0: -23.6, x1: -9.2, z0: -6.15, z1: -3.3 };
export const LOFT = { z0: 6.95, y: 3.8, x0: -26.6, x1: -6.24 };
export const HDOME = { x: -16.42, z: -3.6, a: 4.6, b: 3.1, rim: 0.45, drum: 1.4, win: 0.7, cap: 0.9 };
export const BOTA = [{ x: -16.42, z: -0.6, len: 3.1 }, { x: -16.42, z: 4.4, len: 2.8 }];
export const RISER = { x: -16.42, z: -7.45, w: 2.6, d: 1.6, h: 0.7 };
export const DISCO = { x: -16.42, y: 7.2, z: 1.9 };
export const MIRROR_X = 2 * HALL.xc;

export const ITEMS = [
  [1, 'Nawa główna, 24 m, 3× szersza od kaplicy', -12.6, 6.1],
  [2, 'Kaplica prawa (ta ze zdjęć)', 0, 2.5],
  [3, 'Kaplica lewa (taka sama, lustrzana)', MIRROR_X, 2.5],
  [4, 'Łuki między nawą a kaplicami', -4.2, ARCH.z],
  [5, 'Ściana z kratownicy nawy (ekran LED)', -16.42, -11.6],
  [6, 'Scena z ołtarzem i konsoletą DJ', -16.42, -8.0],
  [7, 'Miejsce pod sceną (tłum)', -12.5, -4.7],
  [8, 'Ławki nawy, 2 bloki po 10 rzędów', -21.4, 2.0],
  [9, 'Ceglane kolumny', -26.3, -2.9],
  [10, 'Chór z organami nad wejściem', -21.0, 7.8],
  [11, 'Wejście, tu zaczynasz', -16.42, 8.3],
  [12, 'Kadzielnice na linach pod sufitem', -16.42, -0.6],
  [13, 'Kula disco', -16.42, 1.9],
  [14, 'Owalna kopuła nawy', -16.42, -3.6],
];
