import type { Spring } from 'math/time';

import type { CurveUniforms } from './curve';
import type { FinClip, Hinges, Turn } from './fins';
import type { Frames } from './frames';
import type { Tuna } from './path';

import { clamp, repeat } from 'math';
import { spring } from 'math/time';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { BODY_SCALE, TURN_MAX, WAVE_LENGTH } from './body';
import { applyCurveDeform } from './curve';
import { applyTurn, createTurn, PAIR_LAG } from './fins';
import { PATH_SPAN, sampleIndex } from './path';
import { createSurface, surfaceAt } from './surface';

const TUNA_SWAY = 0.35;
const ROLL_SMOOTH = 0.3;

const surface = createSurface();

type FinAction = FinClip & {
  action: THREE.AnimationAction;
};

type HingedFin = {
  bone: THREE.Object3D;
  mixerPose: THREE.Quaternion;
  fold?: Turn;
  pitch?: Turn;
};

export type Rig = {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  uniforms: CurveUniforms[];
  materials: THREE.Material[];
  fins: FinAction[];
  hingedFins: HingedFin[];
  roll: Spring<number>;
  placedAt: number;
};

function patchMaterials(root: THREE.Object3D, frames: Frames) {
  const uniforms: CurveUniforms[] = [];
  const materials: THREE.Material[] = [];

  root.traverse((object) => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.frustumCulled = false;

    const shared = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    const own = shared.map((material) => {
      const clone = material.clone();
      uniforms.push(applyCurveDeform(clone, frames, PATH_SPAN));
      materials.push(clone);
      return clone;
    });
    mesh.material = Array.isArray(mesh.material) ? own : own[0];
  });

  return { uniforms, materials };
}

function buildFins(
  mixer: THREE.AnimationMixer,
  root: THREE.Object3D,
  clips: FinClip[],
  hinges: Map<string, Hinges>,
) {
  const fins: FinAction[] = [];
  const hingedFins: HingedFin[] = [];

  for (const fin of clips) {
    const action = mixer.clipAction(fin.clip);
    action.play().setEffectiveWeight(0);
    action.timeScale = 0;
    fins.push({ ...fin, action });

    const name = fin.clip.tracks[0].name.split('.')[0];
    const hinge = hinges.get(name);
    const bone = hinge && root.getObjectByName(name);
    if (!hinge || !bone) continue;

    hingedFins.push({
      bone,
      mixerPose: bone.quaternion.clone(),
      fold: hinge.fold && createTurn(hinge.fold),
      pitch: hinge.pitch && createTurn(hinge.pitch),
    });
  }

  return { fins, hingedFins };
}

export function buildRig(
  source: THREE.Object3D,
  clips: FinClip[],
  hinges: Map<string, Hinges>,
  frames: Frames,
): Rig {
  const root = cloneSkinned(source);
  const { uniforms, materials } = patchMaterials(root, frames);
  const mixer = new THREE.AnimationMixer(root);
  const { fins, hingedFins } = buildFins(mixer, root, clips, hinges);

  return {
    root,
    mixer,
    uniforms,
    materials,
    fins,
    hingedFins,
    roll: spring.create(0),
    placedAt: -1,
  };
}

export function disposeRig(rig: Rig) {
  rig.mixer.stopAllAction();
  for (const material of rig.materials) material.dispose();
}

export function restoreMixerPose(rig: Rig) {
  for (const fin of rig.hingedFins) fin.bone.quaternion.copy(fin.mixerPose);
}

function rollToward(tuna: Tuna, nose: number, screenUp: THREE.Vector3): number {
  const heading = tuna.path.heading[nose];
  const sinHeading = Math.sin(heading);
  const cosHeading = Math.cos(heading);
  const { slope } = surfaceAt(
    surface,
    tuna.lane,
    tuna.path.x[nose],
    tuna.path.z[nose],
    sinHeading,
    cosHeading,
  );

  return Math.atan2(
    Math.sqrt(1 + slope * slope) *
      (cosHeading * screenUp.x - sinHeading * screenUp.z),
    screenUp.y - slope * (sinHeading * screenUp.x + cosHeading * screenUp.z),
  );
}

function updateRoll(
  rig: Rig,
  tuna: Tuna,
  nose: number,
  screenUp: THREE.Vector3,
  dt: number,
): number {
  const upright = rollToward(tuna, nose, screenUp);

  if (rig.placedAt === tuna.placements) {
    spring.dampAngle(rig.roll, upright, ROLL_SMOOTH, dt);
  } else {
    rig.roll.value = upright;
    rig.roll.velocity = 0;
    rig.placedAt = tuna.placements;
  }

  return tuna.drive.bank.value + rig.roll.value;
}

function writeUniforms(rig: Rig, tuna: Tuna, arc: number, roll: number) {
  for (const uniforms of rig.uniforms) {
    uniforms.uHead.value = arc;
    uniforms.uRoll.value = roll;
    uniforms.uWave.value = tuna.drive.wave.value * BODY_SCALE * TUNA_SWAY;
    uniforms.uWavePhase.value = (2 * Math.PI * arc) / WAVE_LENGTH;
  }
}

const finWeight = (fin: FinAction, thrust: number, bend: number) =>
  fin.beatsWith === 'thrust'
    ? thrust
    : fin.beatsWith === 'glide'
      ? 1 - thrust
      : clamp(-fin.side * bend, 0, 1);

function scrubFins(rig: Rig, arc: number, thrust: number, bend: number) {
  for (const fin of rig.fins) {
    const lag = fin.side < 0 ? PAIR_LAG : 0;
    const stroke = repeat((arc * fin.rate) / WAVE_LENGTH + lag, 1);
    fin.action.time = stroke * fin.clip.duration;
    fin.action.setEffectiveWeight(finWeight(fin, thrust, bend));
  }
}

function turnFins(
  rig: Rig,
  gaitRank: number,
  thrust: number,
  climb: number,
  dt: number,
  scratch: THREE.Quaternion,
) {
  for (const fin of rig.hingedFins) {
    fin.mixerPose.copy(fin.bone.quaternion);
    applyTurn(fin.bone, fin.fold, gaitRank, thrust, dt, scratch);
    applyTurn(fin.bone, fin.pitch, gaitRank, climb, dt, scratch);
  }
}

export function drawTuna(
  rig: Rig,
  tuna: Tuna,
  arc: number,
  screenUp: THREE.Vector3,
  dt: number,
  scratch: THREE.Quaternion,
) {
  const nose = sampleIndex(arc);

  writeUniforms(rig, tuna, arc, updateRoll(rig, tuna, nose, screenUp, dt));

  const heading = tuna.path.heading[nose];
  const climb = Math.sin(heading) * screenUp.x + Math.cos(heading) * screenUp.z;
  const bend = tuna.path.curvature[nose] / TURN_MAX;
  const { gaitRank, thrust } = tuna.drive;

  scrubFins(rig, arc, thrust.value, bend);
  turnFins(rig, gaitRank, thrust.value, climb, dt, scratch);
}
