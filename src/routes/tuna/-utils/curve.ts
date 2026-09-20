import type * as THREE from 'three';

import type { Frames } from './frames';

import curveHead from '../-shaders/curve-head.glsl';
import curveNormal from '../-shaders/curve-normal.glsl';
import curveSkin from '../-shaders/curve-skin.glsl';
import { BODY_LENGTH, BODY_SCALE, WAVE_LENGTH } from './body';

const CURVE_TRANSFORM =
  'transformed = dfP + dfR * ( dfSkinned.x + dfLat ) + dfU * dfSkinned.y;';

export type CurveUniforms = ReturnType<typeof applyCurveDeform>;

export function applyCurveDeform(
  material: THREE.Material,
  frames: Frames,
  span: number,
) {
  const uniforms = {
    uCurve: { value: frames.texture },
    uSamples: { value: frames.samples },
    uTotal: { value: span },
    uHead: { value: 0 },
    uRoll: { value: 0 },
    uWave: { value: 0 },
    uWaveLength: { value: WAVE_LENGTH },
    uWavePhase: { value: 0 },
    uBodyLength: { value: BODY_LENGTH },
    uBodyScale: { value: BODY_SCALE },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `${curveHead}\n${shader.vertexShader}`
      .replace('#include <skinbase_vertex>', () => `\n${curveSkin}\n`)
      .replace('#include <defaultnormal_vertex>', () => `\n${curveNormal}\n`)
      .replace('#include <skinning_vertex>', () => CURVE_TRANSFORM);
  };

  material.customProgramCacheKey = () => 'curve-deform';
  material.needsUpdate = true;
  return uniforms;
}
