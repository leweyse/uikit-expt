import { repeat } from 'math';
import * as THREE from 'three';

const ROWS = 3;

export type Frames = {
  texture: THREE.DataTexture;
  data: Float32Array;
  samples: number;
  dirtyLo: number;
  dirtyHi: number;
};

export function createFrames(samples: number): Frames {
  const data = new Float32Array(samples * ROWS * 4);
  const texture = new THREE.DataTexture(
    data,
    samples,
    ROWS,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return { texture, data, samples, dirtyLo: 0, dirtyHi: samples };
}

export function markAllDirty(frames: Frames) {
  frames.dirtyLo = 0;
  frames.dirtyHi = frames.samples;
}

export function writeFrame(
  frames: Frames,
  sample: number,
  x: number,
  y: number,
  z: number,
  sinHeading: number,
  cosHeading: number,
  slope: number,
) {
  const { data, samples } = frames;
  const row = samples * 4;
  const o = repeat(Math.round(sample), samples) * 4;
  const n = 1 / Math.sqrt(1 + slope * slope);

  data[o] = x;
  data[o + 1] = y;
  data[o + 2] = z;
  data[o + 3] = 1;

  data[row + o] = -cosHeading;
  data[row + o + 1] = 0;
  data[row + o + 2] = sinHeading;
  data[row + o + 3] = 1;

  data[2 * row + o] = -sinHeading * slope * n;
  data[2 * row + o + 1] = n;
  data[2 * row + o + 2] = -cosHeading * slope * n;
  data[2 * row + o + 3] = 1;

  if (sample < frames.dirtyLo) frames.dirtyLo = sample;
  if (sample > frames.dirtyHi) frames.dirtyHi = sample;
}

const dirtyRuns = (lo: number, span: number, samples: number) => {
  const start = repeat(lo, samples);
  const end = start + span;
  if (end <= samples) return [[start, span]];
  return [
    [start, samples - start],
    [0, end - samples],
  ];
};

export function upload(frames: Frames) {
  const { texture, samples, dirtyLo, dirtyHi } = frames;
  frames.dirtyLo = Number.POSITIVE_INFINITY;
  frames.dirtyHi = Number.NEGATIVE_INFINITY;
  if (dirtyHi < dirtyLo) return;

  texture.needsUpdate = true;

  const span = dirtyHi - dirtyLo + 1;
  if (span >= samples) {
    texture.clearUpdateRanges();
    return;
  }

  for (const [from, count] of dirtyRuns(dirtyLo, span, samples)) {
    for (let row = 0; row < ROWS; row++) {
      texture.addUpdateRange((row * samples + from) * 4, count * 4);
    }
  }
}
