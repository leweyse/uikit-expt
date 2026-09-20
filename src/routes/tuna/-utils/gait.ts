import type { Spring } from 'math/time';

import { clamp, degreesToRadians, lerp, remapClamp } from 'math';
import { spring } from 'math/time';

import { RIG_GLIDE_FRICTION, RIG_WAVE_LENGTH, TURN_MAX } from './body';

const TUNA_SPEED = 2.25;
const GLIDE_BAND = 0.871;

const THRUST_SMOOTH = 0.25;
const WAVE_SMOOTH = 0.1;
const BANK_RESPONSE = 0.45;
const BANK_DAMPING = 0.75;

const GLIDE_TURN_MIN = 0.5;
const GLIDE_TURN_MAX = 0.8;

const ROLL_PER_TURN = 5;
const ROLL_MAX = 15;

export type GaitName = 'efficient' | 'generalist' | 'fast';

type Gait = {
  name: GaitName;
  maxTurnFraction: number;
  cruise: number;
  period: number;
  surgeMin: number;
  surgeMax: number;
  surgeMean: number;
  burstEndsAt: number;
};

const GAITS: readonly Gait[] = [
  {
    name: 'efficient',
    maxTurnFraction: 0.62,
    cruise: 2.6,
    period: 3.3333,
    surgeMin: 0.5666,
    surgeMax: 1.0,
    surgeMean: 0.751,
    burstEndsAt: 0.3,
  },
  {
    name: 'generalist',
    maxTurnFraction: 0.95,
    cruise: 3.0,
    period: 2.6667,
    surgeMin: 0.7013,
    surgeMax: 1.0,
    surgeMean: 0.8744,
    burstEndsAt: 0.75,
  },
  {
    name: 'fast',
    maxTurnFraction: Number.POSITIVE_INFINITY,
    cruise: 4.0,
    period: 1.1667,
    surgeMin: 0.8791,
    surgeMax: 1.0,
    surgeMean: 0.9432,
    burstEndsAt: 0.714,
  },
];

const SLOWEST_GAIT = 0;

export const gaitRankOf = (name: GaitName) =>
  GAITS.findIndex((gait) => gait.name === name);

const gaitRankFor = (curvature: number) =>
  GAITS.findIndex((gait) => curvature < gait.maxTurnFraction * TURN_MAX);

const topSpeed = (gait: Gait) => (gait.cruise * gait.surgeMax) / gait.surgeMean;

const lowSpeed = (gait: Gait) => (gait.cruise * gait.surgeMin) / gait.surgeMean;

const bottomSpeed = (gait: Gait) =>
  topSpeed(gait) - (topSpeed(gait) - lowSpeed(gait)) * GLIDE_BAND;

const burstAccel = (gait: Gait) =>
  (topSpeed(gait) - lowSpeed(gait)) / (gait.burstEndsAt * gait.period);

const TAIL_DECAY_BEATS = 3.0;

const MEASURED_TAIL_DECAY: readonly number[] = [
  1.0, 0.61566, 0.38436, 0.24398, 0.15784, 0.10428, 0.07045, 0.04868, 0.03439,
  0.02479, 0.01819, 0.01357, 0.01025, 0.00782, 0.00602, 0.00467, 0.00364,
  0.00284, 0.00223, 0.00175, 0.00138, 0.00109, 0.00086, 0.00068, 0.00054,
  0.00042, 0.00033, 0.00026, 0.00021, 0.00017, 0.00013, 0.0001, 8e-5, 6e-5,
  5e-5, 4e-5, 3e-5, 3e-5, 2e-5, 2e-5, 1e-5, 1e-5, 1e-5, 1e-5, 0.0, 0.0, 0.0,
  0.0, 0.0,
];

function tailDecay(beats: number): number {
  const last = MEASURED_TAIL_DECAY.length - 1;
  const at = clamp(beats / TAIL_DECAY_BEATS, 0, 1) * last;
  const i = Math.floor(at);
  if (i >= last) return MEASURED_TAIL_DECAY[last];
  return lerp(MEASURED_TAIL_DECAY[i], MEASURED_TAIL_DECAY[i + 1], at - i);
}

export type Drive = {
  speed: number;
  isBursting: boolean;
  glideSeconds: number;
  wave: Spring<number>;
  thrust: Spring<number>;
  bank: Spring<number>;
  gaitRank: number;
  timeInGait: number;
};

const restSpring = (state: Spring<number>) => {
  state.value = 0;
  state.velocity = 0;
};

export function createDrive(pace: number): Drive {
  const drive: Drive = {
    speed: 0,
    isBursting: true,
    glideSeconds: 0,
    wave: spring.create(0),
    thrust: spring.create(0),
    bank: spring.create(0),
    gaitRank: SLOWEST_GAIT,
    timeInGait: 0,
  };
  resetDrive(drive, pace);
  return drive;
}

export function resetDrive(drive: Drive, pace: number) {
  drive.speed = bottomSpeed(GAITS[SLOWEST_GAIT]) * TUNA_SPEED * pace;
  drive.isBursting = true;
  drive.glideSeconds = 0;
  drive.gaitRank = SLOWEST_GAIT;
  drive.timeInGait = 0;
  restSpring(drive.wave);
  restSpring(drive.thrust);
  restSpring(drive.bank);
}

function chooseGait(drive: Drive, curvatureAhead: number, dt: number) {
  drive.timeInGait += dt;
  const wanted = gaitRankFor(curvatureAhead);
  const period = GAITS[drive.gaitRank].period;
  if (wanted !== drive.gaitRank && drive.timeInGait >= period) {
    drive.gaitRank = wanted;
    drive.timeInGait = 0;
  }
}

function advanceSpeed(drive: Drive, pace: number, dt: number) {
  const gait = GAITS[drive.gaitRank];
  const scale = TUNA_SPEED * pace;
  const top = topSpeed(gait) * scale;
  const bottom = bottomSpeed(gait) * scale;

  if (drive.speed > top) drive.isBursting = false;

  if (drive.isBursting) {
    drive.speed = Math.min(top, drive.speed + burstAccel(gait) * scale * dt);
    if (drive.speed >= top - 1e-4) drive.isBursting = false;
  } else {
    drive.speed *= Math.exp(-RIG_GLIDE_FRICTION * drive.speed * dt);
    if (drive.speed <= bottom) drive.isBursting = true;
  }

  drive.glideSeconds = drive.isBursting ? 0 : drive.glideSeconds + dt;
}

function advanceSprings(drive: Drive, curvature: number, dt: number) {
  spring.damp(drive.thrust, drive.isBursting ? 1 : 0, THRUST_SMOOTH, dt);

  const poweredTurn = remapClamp(
    Math.abs(curvature),
    GLIDE_TURN_MIN * TURN_MAX,
    GLIDE_TURN_MAX * TURN_MAX,
    0,
    1,
  );
  const beats = drive.glideSeconds * (drive.speed / RIG_WAVE_LENGTH);
  const wave = drive.isBursting ? 1 : Math.max(poweredTurn, tailDecay(beats));
  spring.damp(drive.wave, wave, WAVE_SMOOTH, dt);

  const bank = degreesToRadians(
    clamp(ROLL_PER_TURN * curvature * drive.speed, -ROLL_MAX, ROLL_MAX),
  );
  spring.update(
    drive.bank,
    bank,
    spring.fromResponse(BANK_RESPONSE),
    BANK_DAMPING,
    dt,
  );
}

export function swim(
  drive: Drive,
  curvatureAhead: number,
  curvatureNow: number,
  pace: number,
  dt: number,
): number {
  chooseGait(drive, curvatureAhead, dt);
  advanceSpeed(drive, pace, dt);
  advanceSprings(drive, curvatureNow, dt);
  return drive.speed * dt;
}
