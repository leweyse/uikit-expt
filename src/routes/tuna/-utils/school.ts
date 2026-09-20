import { degreesToRadians, deltaAngle } from 'math';
import { random } from 'math/random';

import { BODY_HALF_WIDTH, BODY_HEIGHT, BODY_LENGTH } from './body';
import { createField, edgeX, type Field, onScreen } from './field';
import { markAllDirty } from './frames';
import { resetDrive } from './gait';
import {
  createTuna,
  extend,
  PATH_HISTORY,
  PATH_HORIZON,
  PATH_SPAN,
  place,
  publishTrack,
  resetCursor,
  sampleIndex,
  type Tuna,
} from './path';
import {
  createSurface,
  SWELL_CLEARANCE,
  SWELL_HEIGHT,
  surfaceAt,
} from './surface';

const TUNA_COUNT = 7;
const TUNA_POOL = 12;

const TUNA_RENEW = 0.85;
const TUNA_ONEWAY = 0.5;
const TUNA_ENTRY_SPREAD = degreesToRadians(20);
const TUNA_PACE_SPREAD = 0.3;

const LANE_GAP = BODY_HEIGHT + SWELL_CLEARANCE;
const CAMERA_CLEARANCE = BODY_HEIGHT;

const SPAWN_GAP = 2 * BODY_HALF_WIDTH;
const SPAWN_SAMPLES = 12;
const SPAWN_TRIES = 96;

const BODY_PROBES = 5;
const ENTRY_NDC = 0.04;
const EDGE_SOLVE_STEPS = 2;

const surface = createSurface();

export type School = {
  tuna: Tuna[];
  field: Field;
};

export function createSchool(): School {
  return {
    tuna: Array.from({ length: TUNA_POOL }, createTuna),
    field: createField(),
  };
}

const laneDepth = (slot: number) => (slot - (TUNA_COUNT - 1) / 2) * LANE_GAP;

const bodyProbeIndex = (tuna: Tuna, probe: number) =>
  sampleIndex(tuna.nose - (probe / (BODY_PROBES - 1)) * BODY_LENGTH);

function entryCourse(): number {
  const fromLeft = random.bool(Math.random, TUNA_ONEWAY);
  return (
    (fromLeft ? Math.PI / 2 : -Math.PI / 2) +
    random.float(Math.random, -TUNA_ENTRY_SPREAD, TUNA_ENTRY_SPREAD)
  );
}

function roomiest<T>(
  sample: () => T,
  score: (candidate: T) => number,
  enough: number,
): T {
  let best = sample();
  let bestScore = score(best);

  for (let tries = 1; tries < SPAWN_TRIES && bestScore < enough; tries++) {
    const candidate = sample();
    const candidateScore = score(candidate);
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }

  return best;
}

function distanceToBody(tuna: Tuna, x: number, z: number): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (let probe = 0; probe < BODY_PROBES; probe++) {
    const i = bodyProbeIndex(tuna, probe);
    const distance = Math.hypot(x - tuna.path.x[i], z - tuna.path.z[i]);
    if (distance < nearest) nearest = distance;
  }
  return nearest;
}

function distanceToSchool(
  school: School,
  self: Tuna,
  x: number,
  z: number,
): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const other of school.tuna) {
    if (other === self || !other.isLive) continue;
    const distance = distanceToBody(other, x, z);
    if (distance < nearest) nearest = distance;
  }
  return nearest;
}

function reroll(tuna: Tuna): number {
  const course = entryCourse();
  tuna.course = course;
  tuna.phase = random.float(Math.random, 0, 2 * Math.PI);
  tuna.pace = random.float(
    Math.random,
    1 - TUNA_PACE_SPREAD,
    1 + TUNA_PACE_SPREAD,
  );
  resetDrive(tuna.drive, tuna.pace);
  return course;
}

function restart(school: School, tuna: Tuna) {
  const course = reroll(tuna);
  resetCursor(tuna, course);
  tuna.wanderOffset = random.float(Math.random, 0, PATH_SPAN);
  tuna.nose = PATH_HISTORY;
  markAllDirty(tuna.frames);
  extend(tuna, school.field, school.tuna, PATH_HISTORY + PATH_HORIZON);
}

function outlineOf(tuna: Tuna, out: Float32Array) {
  const step = BODY_LENGTH / (SPAWN_SAMPLES - 1);
  const nose = sampleIndex(tuna.nose);
  for (let p = 0; p < SPAWN_SAMPLES; p++) {
    const i = sampleIndex(tuna.nose - p * step);
    out[p * 2] = tuna.path.x[i] - tuna.path.x[nose];
    out[p * 2 + 1] = tuna.path.z[i] - tuna.path.z[nose];
  }
}

function distanceToTaken(
  taken: Float32Array,
  placed: number,
  outline: Float32Array,
  x: number,
  z: number,
): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (let p = 0; p < SPAWN_SAMPLES; p++) {
    const px = x + outline[p * 2];
    const pz = z + outline[p * 2 + 1];
    for (let q = 0; q < placed * SPAWN_SAMPLES; q++) {
      const distance = Math.hypot(px - taken[q * 2], pz - taken[q * 2 + 1]);
      if (distance < nearest) nearest = distance;
    }
  }
  return nearest;
}

function spreadOut(school: School) {
  const { field } = school;
  const outline = new Float32Array(SPAWN_SAMPLES * 2);
  const taken = new Float32Array(school.tuna.length * SPAWN_SAMPLES * 2);
  let placed = 0;

  for (const tuna of school.tuna) {
    if (!tuna.isLive) continue;

    outlineOf(tuna, outline);

    const spot = roomiest(
      () => ({
        x: random.float(Math.random, -field.viewHalfWidth, field.viewHalfWidth),
        z: random.float(
          Math.random,
          -field.bandHalfHeight,
          field.bandHalfHeight,
        ),
      }),
      ({ x, z }) => distanceToTaken(taken, placed, outline, x, z),
      SPAWN_GAP,
    );

    place(tuna, spot.x, spot.z);

    for (let p = 0; p < SPAWN_SAMPLES; p++) {
      const o = (placed * SPAWN_SAMPLES + p) * 2;
      taken[o] = spot.x + outline[p * 2];
      taken[o + 1] = spot.z + outline[p * 2 + 1];
    }
    placed++;
  }
}

export function seedSchool(school: School) {
  school.tuna.forEach((tuna, slot) => {
    tuna.isLive = false;
    tuna.slot = slot;
    tuna.lane = laneDepth(slot);
  });

  for (const tuna of school.tuna) restart(school, tuna);
  for (const tuna of school.tuna) tuna.isLive = tuna.slot < TUNA_COUNT;

  spreadOut(school);
  for (const tuna of school.tuna) if (tuna.isLive) publishTrack(tuna);
}

function claimLane(school: School, tuna: Tuna): boolean {
  const { field } = school;
  const taken = new Set<number>();
  for (const other of school.tuna) {
    if (other !== tuna && other.isLive) taken.add(other.slot);
  }

  const clear = CAMERA_CLEARANCE + SWELL_HEIGHT;
  const cameraInside =
    Math.abs(field.cameraX) < field.viewHalfWidth &&
    Math.abs(field.cameraZ) < field.bandHalfHeight;

  for (let slot = 0; slot < TUNA_COUNT; slot++) {
    if (taken.has(slot)) continue;
    if (cameraInside && Math.abs(laneDepth(slot) - field.cameraY) < clear) {
      continue;
    }
    tuna.slot = slot;
    tuna.lane = laneDepth(slot);
    return true;
  }
  return false;
}

function offScreen(field: Field, tuna: Tuna): boolean {
  const { path } = tuna;

  for (let probe = 0; probe < BODY_PROBES; probe++) {
    const i = bodyProbeIndex(tuna, probe);
    if (onScreen(field, path.x[i], path.y[i], path.z[i])) return false;
  }

  const nose = sampleIndex(tuna.nose);
  const x = path.x[nose];
  const z = path.z[nose];
  const heading = path.heading[nose];
  return (
    (Math.abs(x) > field.viewHalfWidth &&
      Math.sign(Math.sin(heading)) === Math.sign(x)) ||
    (Math.abs(z) > field.viewHalfHeight &&
      Math.sign(Math.cos(heading)) === Math.sign(z))
  );
}

function entryEdgeX(
  field: Field,
  lane: number,
  z: number,
  ndc: number,
  sinCourse: number,
  cosCourse: number,
): number {
  let x = edgeX(field, lane, z, ndc);
  for (let solve = 0; solve < EDGE_SOLVE_STEPS; solve++) {
    const { y } = surfaceAt(surface, lane, x, z, sinCourse, cosCourse);
    x = edgeX(field, y, z, ndc);
  }
  return x;
}

function admit(school: School, tuna: Tuna): boolean {
  if (!claimLane(school, tuna)) return false;

  const { field } = school;
  const wasHeading = tuna.path.heading[sampleIndex(tuna.nose)];
  const course = reroll(tuna);
  const turn = deltaAngle(wasHeading, course);

  const sinCourse = Math.sin(course);
  const cosCourse = Math.cos(course);
  const ndc = (sinCourse > 0 ? -1 : 1) * (1 + ENTRY_NDC);
  const probeX = entryEdgeX(field, tuna.lane, 0, ndc, sinCourse, cosCourse);

  const z = roomiest(
    () =>
      random.float(Math.random, -field.bandHalfHeight, field.bandHalfHeight),
    (candidate) => distanceToSchool(school, tuna, probeX, candidate),
    SPAWN_GAP,
  );

  const x = entryEdgeX(field, tuna.lane, z, ndc, sinCourse, cosCourse);
  place(tuna, x, z, turn);
  publishTrack(tuna);
  tuna.isLive = true;
  return true;
}

export function renew(school: School) {
  let live = 0;

  for (const tuna of school.tuna) {
    if (tuna.isLive && offScreen(school.field, tuna)) {
      tuna.isLive = false;
      if (random.bool(Math.random, TUNA_RENEW)) admit(school, tuna);
    }
    if (tuna.isLive) live++;
  }

  for (const tuna of school.tuna) {
    if (live >= TUNA_COUNT) break;
    if (!tuna.isLive && admit(school, tuna)) live++;
  }
}
