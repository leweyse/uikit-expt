export const FIELD_HALF_WIDTH = 14;
export const FIELD_HALF_HEIGHT = 4;
export const FIELD_HALF_WIDTH_MIN = 6;
export const FIELD_HALF_HEIGHT_MAX = 12;
export const FIELD_ASPECT = 16 / 9;
export const FIELD_BAND = 0.8;
export const FIELD_EASE = 0.4;

const EXIT_NDC = 0.08;

export type Field = {
  bandHalfHeight: number;
  viewHalfWidth: number;
  viewHalfHeight: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  clip: Float64Array;
};

export function createField(): Field {
  return {
    bandHalfHeight: FIELD_HALF_HEIGHT,
    viewHalfWidth: FIELD_HALF_WIDTH,
    viewHalfHeight: FIELD_HALF_HEIGHT,
    cameraX: 0,
    cameraY: 0,
    cameraZ: 0,
    clip: new Float64Array(16),
  };
}

export function resizeField(
  field: Field,
  viewHalfWidth: number,
  viewHalfHeight: number,
) {
  field.viewHalfWidth = viewHalfWidth;
  field.viewHalfHeight = viewHalfHeight;
  field.bandHalfHeight = viewHalfHeight * FIELD_BAND;
}

export function trackCamera(
  field: Field,
  camera: { x: number; y: number; z: number },
  clip: ArrayLike<number>,
) {
  field.cameraX = camera.x;
  field.cameraY = camera.y;
  field.cameraZ = camera.z;
  field.clip.set(clip);
}

export function edgeX(field: Field, y: number, z: number, ndc: number): number {
  const m = field.clip;
  const num =
    ndc * (m[7] * y + m[11] * z + m[15]) - (m[4] * y + m[8] * z + m[12]);
  const den = m[0] - ndc * m[3];
  return Math.abs(den) < 1e-12 ? ndc * field.viewHalfWidth : num / den;
}

export function onScreen(
  field: Field,
  x: number,
  y: number,
  z: number,
): boolean {
  const m = field.clip;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (w <= 0) return false;

  const ndcX = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  const ndcY = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  return (
    ndcX > -1 - EXIT_NDC &&
    ndcX < 1 + EXIT_NDC &&
    ndcY > -1 - EXIT_NDC &&
    ndcY < 1 + EXIT_NDC
  );
}
