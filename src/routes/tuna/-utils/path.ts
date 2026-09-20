import type { Field } from './field';

import {
  clamp,
  degreesToRadians,
  deltaAngle,
  lerp,
  remapClamp,
  repeat,
} from 'math';

import { BODY_FLEX, BODY_LENGTH, RIG_LENGTH, TURN_MAX } from './body';
import { FIELD_EASE } from './field';
import {
  createFrames,
  type Frames,
  markAllDirty,
  upload,
  writeFrame,
} from './frames';
import { createDrive, type Drive, swim } from './gait';
import { createSurface, surfaceAt } from './surface';

const PATH_SAMPLES = 2048;
export const PATH_SPAN = 120;
const PATH_STEP = PATH_SPAN / PATH_SAMPLES;

export const PATH_HISTORY = 8 * RIG_LENGTH;
export const PATH_HORIZON = 12 * RIG_LENGTH;

const TURN_RAMP = 0.35;
const TURN_STEP = (TURN_MAX / (TURN_RAMP * 3 * RIG_LENGTH)) * PATH_STEP;

const WANDER_RATE = 0.055;
const WANDER_SWING = degreesToRadians(55);
const WANDER_AIM = 3 * RIG_LENGTH;
const WANDER_CAP = 0.15;

const EDGE_TURN = 0.18 * BODY_FLEX;

const EDGE_MAX_RISE = Math.sin(degreesToRadians(30));
const MAX_CLIMB = degreesToRadians(30);
const CLIMB_EASE = degreesToRadians(6);

const AVOID_REACH = 6 * BODY_LENGTH;
const AVOID_URGENT = 3 * BODY_LENGTH;
const AVOID_ARC = degreesToRadians(110);
const AVOID_TIE = degreesToRadians(25);
const AVOID_TAKEOVER = 1;

const AVOID_SAMPLES = 9;
const AVOID_SPAN = BODY_LENGTH + PATH_HORIZON;
const AVOID_STEP = AVOID_SPAN / (AVOID_SAMPLES - 1);

const LOOK_AHEAD = RIG_LENGTH;

const surface = createSurface();

type Cursor = {
  arc: number;
  x: number;
  z: number;
  heading: number;
  curvature: number;
};

type Path = {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  heading: Float32Array;
  curvature: Float32Array;
  cursor: Cursor;
};

export type Tuna = {
  path: Path;
  frames: Frames;
  drive: Drive;

  nose: number;
  isLive: boolean;
  lane: number;
  slot: number;
  pace: number;
  course: number;
  phase: number;
  wanderOffset: number;

  track: Float32Array;
  trackNose: number;
  placements: number;
};

export function createTuna(): Tuna {
  return {
    path: {
      x: new Float32Array(PATH_SAMPLES),
      y: new Float32Array(PATH_SAMPLES),
      z: new Float32Array(PATH_SAMPLES),
      heading: new Float32Array(PATH_SAMPLES),
      curvature: new Float32Array(PATH_SAMPLES),
      cursor: { arc: 0, x: 0, z: 0, heading: 0, curvature: 0 },
    },
    frames: createFrames(PATH_SAMPLES),
    drive: createDrive(1),
    nose: 0,
    isLive: false,
    lane: 0,
    slot: 0,
    pace: 1,
    course: 0,
    phase: 0,
    wanderOffset: 0,
    track: new Float32Array(AVOID_SAMPLES * 2),
    trackNose: 0,
    placements: 0,
  };
}

export const sampleIndex = (arc: number) =>
  repeat(Math.round(arc / PATH_STEP), PATH_SAMPLES);

function writeSample(
  tuna: Tuna,
  arc: number,
  x: number,
  z: number,
  heading: number,
  sinHeading: number,
  cosHeading: number,
): number {
  surfaceAt(surface, tuna.lane, x, z, sinHeading, cosHeading);

  const { path } = tuna;
  const i = sampleIndex(arc);
  path.x[i] = x;
  path.y[i] = surface.y;
  path.z[i] = z;
  path.heading[i] = heading;

  writeFrame(
    tuna.frames,
    arc / PATH_STEP,
    x,
    surface.y,
    z,
    sinHeading,
    cosHeading,
    surface.slope,
  );

  return i;
}

function steerByWander(tuna: Tuna): number {
  const { cursor } = tuna.path;
  const wander = tuna.wanderOffset + cursor.arc;
  const swing =
    WANDER_SWING *
    Math.sin(wander * WANDER_RATE) *
    Math.sin(wander * WANDER_RATE * Math.SQRT2 + tuna.phase);

  const away = deltaAngle(cursor.heading, tuna.course + swing);
  const curvature =
    Math.abs(away) > Math.PI / 2
      ? Math.sign(away) * TURN_MAX
      : (2 * Math.sin(away)) / WANDER_AIM;

  return clamp(curvature, -WANDER_CAP * TURN_MAX, WANDER_CAP * TURN_MAX);
}

function steerFromEdge(tuna: Tuna, field: Field, curvature: number): number {
  const { cursor } = tuna.path;
  const band = field.bandHalfHeight;
  const ease = band * FIELD_EASE;
  const out =
    cursor.z > band
      ? remapClamp(cursor.z, band, band + ease, 0, 1)
      : cursor.z < -band
        ? remapClamp(cursor.z, -band, -band - ease, 0, 1)
        : 0;
  if (out === 0) return curvature;

  const inward = (cursor.z > 0 ? -out : out) * EDGE_MAX_RISE;
  const back = clamp(
    deltaAngle(cursor.heading, Math.atan2(Math.sin(cursor.heading), inward)) *
      EDGE_TURN,
    -TURN_MAX,
    TURN_MAX,
  );
  return lerp(curvature, back, out);
}

function avoidance(
  cursor: Cursor,
  other: Tuna,
  lo: number,
  hi: number,
): number {
  let nearest = Number.POSITIVE_INFINITY;
  let toX = 0;
  let toZ = 0;

  for (let p = lo; p <= hi; p++) {
    const dx = other.track[p * 2] - cursor.x;
    const dz = other.track[p * 2 + 1] - cursor.z;
    const distance = Math.hypot(dx, dz);
    if (distance < nearest) {
      nearest = distance;
      toX = dx;
      toZ = dz;
    }
  }

  if (nearest >= AVOID_REACH) return 0;

  const bearing = deltaAngle(cursor.heading, Math.atan2(toX, toZ));
  if (Math.abs(bearing) > AVOID_ARC) return 0;

  const side = Math.abs(bearing) < AVOID_TIE ? -1 : bearing > 0 ? -1 : 1;
  return side * remapClamp(nearest, AVOID_REACH, AVOID_URGENT, 0, 1);
}

function steerAroundNeighbours(
  tuna: Tuna,
  school: readonly Tuna[],
  curvature: number,
): number {
  const { cursor } = tuna.path;
  const ahead = cursor.arc - tuna.trackNose;
  const lo = clamp(Math.floor(ahead / AVOID_STEP), 0, AVOID_SAMPLES - 1);
  const hi = clamp(
    Math.ceil((ahead + BODY_LENGTH) / AVOID_STEP),
    0,
    AVOID_SAMPLES - 1,
  );

  let steer = 0;
  let urgency = 0;

  for (const other of school) {
    if (other === tuna || !other.isLive) continue;
    const push = avoidance(cursor, other, lo, hi);
    steer += push;
    urgency = Math.max(urgency, Math.abs(push));
  }

  if (steer === 0) return curvature;

  return lerp(
    curvature,
    steer > 0 ? TURN_MAX : -TURN_MAX,
    clamp(urgency, 0, AVOID_TAKEOVER),
  );
}

function steerFromVertical(tuna: Tuna, curvature: number): number {
  const { cursor } = tuna.path;
  const across = Math.sign(Math.sin(cursor.heading)) || 1;
  const climb = deltaAngle(across * (Math.PI / 2), cursor.heading);
  const over = Math.abs(climb) - MAX_CLIMB;
  if (over <= 0) return curvature;

  return lerp(
    curvature,
    -Math.sign(climb) * TURN_MAX,
    clamp(over / CLIMB_EASE, 0, 1),
  );
}

export function extend(
  tuna: Tuna,
  field: Field,
  school: readonly Tuna[],
  to: number,
) {
  const { path } = tuna;
  const { cursor } = path;

  while (cursor.arc < to) {
    let wanted = steerByWander(tuna);
    wanted = steerFromEdge(tuna, field, wanted);
    wanted = steerAroundNeighbours(tuna, school, wanted);
    wanted = steerFromVertical(tuna, wanted);
    wanted = clamp(wanted, -TURN_MAX, TURN_MAX);

    cursor.curvature += clamp(wanted - cursor.curvature, -TURN_STEP, TURN_STEP);

    const sinHeading = Math.sin(cursor.heading);
    const cosHeading = Math.cos(cursor.heading);
    const i = writeSample(
      tuna,
      cursor.arc,
      cursor.x,
      cursor.z,
      cursor.heading,
      sinHeading,
      cosHeading,
    );
    path.curvature[i] = cursor.curvature;

    cursor.x += sinHeading * PATH_STEP;
    cursor.z += cosHeading * PATH_STEP;
    cursor.heading += cursor.curvature * PATH_STEP;
    cursor.arc += PATH_STEP;
  }
}

export function resetCursor(tuna: Tuna, course: number) {
  const { cursor } = tuna.path;
  cursor.arc = 0;
  cursor.x = 0;
  cursor.z = 0;
  cursor.heading = course;
  cursor.curvature = 0;
}

function rebuild(
  tuna: Tuna,
  field: Field,
  school: readonly Tuna[],
  from: number,
) {
  const { path } = tuna;
  const { cursor } = path;

  const at = Math.round(from / PATH_STEP) * PATH_STEP;
  if (at >= cursor.arc) return;

  const i = sampleIndex(at);
  cursor.arc = at;
  cursor.x = path.x[i];
  cursor.z = path.z[i];
  cursor.heading = path.heading[i];
  cursor.curvature = path.curvature[i];

  extend(tuna, field, school, at + PATH_HORIZON);
}

function movePath(tuna: Tuna, x: number, z: number, turn: number) {
  const { path } = tuna;
  const { cursor } = path;

  const nose = sampleIndex(tuna.nose);
  const fromX = path.x[nose];
  const fromZ = path.z[nose];
  const cosTurn = Math.cos(turn);
  const sinTurn = Math.sin(turn);

  for (
    let arc = Math.max(0, cursor.arc - PATH_SPAN);
    arc < cursor.arc;
    arc += PATH_STEP
  ) {
    const i = sampleIndex(arc);
    const offsetX = path.x[i] - fromX;
    const offsetZ = path.z[i] - fromZ;
    const heading = path.heading[i] + turn;
    writeSample(
      tuna,
      arc,
      x + offsetX * cosTurn + offsetZ * sinTurn,
      z - offsetX * sinTurn + offsetZ * cosTurn,
      heading,
      Math.sin(heading),
      Math.cos(heading),
    );
  }

  const cursorX = cursor.x - fromX;
  const cursorZ = cursor.z - fromZ;
  cursor.x = x + cursorX * cosTurn + cursorZ * sinTurn;
  cursor.z = z - cursorX * sinTurn + cursorZ * cosTurn;
  cursor.heading += turn;
}

export function place(tuna: Tuna, x: number, z: number, turn = 0) {
  movePath(tuna, x, z, turn);
  markAllDirty(tuna.frames);
  tuna.placements++;
}

export function publishTrack(tuna: Tuna) {
  tuna.trackNose = tuna.nose;
  for (let p = 0; p < AVOID_SAMPLES; p++) {
    const i = sampleIndex(tuna.nose - BODY_LENGTH + p * AVOID_STEP);
    tuna.track[p * 2] = tuna.path.x[i];
    tuna.track[p * 2 + 1] = tuna.path.z[i];
  }
}

function curvatureAhead(tuna: Tuna, arc: number): number {
  const steps = Math.max(1, Math.round(LOOK_AHEAD / PATH_STEP));
  let sum = 0;
  for (let q = 0; q <= steps; q++) {
    sum += Math.abs(tuna.path.curvature[sampleIndex(arc + q * PATH_STEP)]);
  }
  return sum / (steps + 1);
}

export function step(
  tuna: Tuna,
  field: Field,
  school: readonly Tuna[],
  dt: number,
): number {
  const arc = tuna.nose;

  rebuild(tuna, field, school, arc + RIG_LENGTH);
  publishTrack(tuna);
  upload(tuna.frames);

  tuna.nose =
    arc +
    swim(
      tuna.drive,
      curvatureAhead(tuna, arc),
      tuna.path.curvature[sampleIndex(arc)],
      tuna.pace,
      dt,
    );

  return arc;
}
