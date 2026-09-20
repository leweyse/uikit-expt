import { BODY_HALF_WIDTH } from './body';

export const SWELL_HEIGHT = 1.2;
const SWELL_LENGTH = 48;

type Wave = {
  dx: number;
  dz: number;
  k: number;
  weight: number;
  phase: number;
};

const WAVES: readonly Wave[] = [
  { dx: 1, dz: 0, length: 1.0, weight: 0.45, phase: 0.0 },
  { dx: 0, dz: 1, length: 1.37, weight: 0.33, phase: 1.9 },
  {
    dx: Math.SQRT1_2,
    dz: Math.SQRT1_2,
    length: 0.61,
    weight: 0.22,
    phase: 4.1,
  },
].map(({ length, ...wave }) => ({
  ...wave,
  k: (2 * Math.PI) / (SWELL_LENGTH * length),
}));

export const SWELL_CLEARANCE =
  SWELL_HEIGHT *
  WAVES.reduce((sum, wave) => sum + wave.weight * wave.k, 0) *
  BODY_HALF_WIDTH;

export type Surface = {
  y: number;
  slope: number;
};

export const createSurface = (): Surface => ({ y: 0, slope: 0 });

export function surfaceAt(
  out: Surface,
  lane: number,
  x: number,
  z: number,
  sinHeading: number,
  cosHeading: number,
): Surface {
  let height = 0;
  let gradient = 0;

  for (const wave of WAVES) {
    const at = wave.k * (wave.dx * x + wave.dz * z) + wave.phase;
    height += wave.weight * Math.sin(at);
    gradient +=
      wave.weight *
      wave.k *
      (wave.dx * sinHeading + wave.dz * cosHeading) *
      Math.cos(at);
  }

  out.y = lane + SWELL_HEIGHT * height;
  out.slope = SWELL_HEIGHT * gradient;
  return out;
}
