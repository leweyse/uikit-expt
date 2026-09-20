import type { Spring } from 'math/time';

import type { GaitName } from './gait';

import { clamp, degreesToRadians } from 'math';
import { spring } from 'math/time';
import * as THREE from 'three';

import { gaitRankOf } from './gait';

export type FinDriver = 'thrust' | 'glide' | 'curve';

type FinSpec = {
  beatsWith: FinDriver;
  gain: number;
  rate: number;
  foldAmount?: number;
  foldSeconds?: number;
  foldsFromGait?: GaitName;
  pitchDegrees?: number;
};

const FINS: Record<string, FinSpec> = {
  dorsal_1: {
    beatsWith: 'glide',
    gain: 6,
    rate: 0.35,
    foldAmount: 0.4,
    foldSeconds: 0.12,
    foldsFromGait: 'generalist',
  },
  dorsal_2: { beatsWith: 'thrust', gain: 6, rate: 1 },
  anal: { beatsWith: 'thrust', gain: 6, rate: 1 },
  pectoralL: { beatsWith: 'curve', gain: 1.5, rate: 0.5, pitchDegrees: 8 },
  pectoralR: { beatsWith: 'curve', gain: 1.5, rate: 0.5, pitchDegrees: 8 },
  pelvicL: {
    beatsWith: 'curve',
    gain: 1.5,
    rate: 0.35,
    foldAmount: 0.6,
    foldSeconds: 0.3,
    foldsFromGait: 'fast',
  },
  pelvicR: {
    beatsWith: 'curve',
    gain: 1.5,
    rate: 0.35,
    foldAmount: 0.6,
    foldSeconds: 0.28,
    foldsFromGait: 'fast',
  },
};

const PITCH_SMOOTH = 0.3;
const FOLD_SMOOTH = 0.25;
export const PAIR_LAG = 0.5;

const SNOUT_BONE = 'spine_00';
const TAIL_BONE = 'caudal_02';
const DORSAL_BONE = 'dorsal_1';
const BACK_BONE = 'spine_03';

const finSide = (bone: string) =>
  bone.endsWith('L') ? 1 : bone.endsWith('R') ? -1 : 0;

const shortestArc = (rotation: THREE.Quaternion) => {
  if (rotation.w < 0) {
    rotation.set(-rotation.x, -rotation.y, -rotation.z, -rotation.w);
  }
  return rotation;
};

function poseKeys(channel: THREE.KeyframeTrack): Float32Array {
  const slots = channel.getValueSize() / 4;
  const keys = channel.times.length;
  const values = new Float32Array(keys * 4);

  for (let k = 0; k < keys; k++) {
    const from = (k * slots + (slots >> 1)) * 4;
    for (let c = 0; c < 4; c++) values[k * 4 + c] = channel.values[from + c];
  }

  return values;
}

function finTrack(channel: THREE.KeyframeTrack, gain: number) {
  const values = poseKeys(channel);

  const rest = new THREE.Quaternion().fromArray(values, 0);
  const key = new THREE.Quaternion();
  const delta = new THREE.Quaternion();
  const axis = new THREE.Vector3();

  for (let i = 0; i < values.length; i += 4) {
    key.fromArray(values, i);
    shortestArc(delta.copy(rest).invert().multiply(key));

    const angle = 2 * Math.acos(clamp(delta.w, -1, 1));
    const sin = Math.sqrt(Math.max(0, 1 - delta.w * delta.w));
    if (sin < 1e-6) continue;

    axis.set(delta.x, delta.y, delta.z).divideScalar(sin);
    delta.setFromAxisAngle(axis, angle * gain);
    key.copy(rest).multiply(delta).toArray(values, i);
  }

  return new THREE.QuaternionKeyframeTrack(
    channel.name,
    Array.from(channel.times),
    Array.from(values),
  );
}

export type FinClip = {
  beatsWith: FinDriver;
  side: number;
  rate: number;
  clip: THREE.AnimationClip;
};

export function buildFinClips(animations: THREE.AnimationClip[]): FinClip[] {
  const authored = animations.find((clip) => clip.name === 'fins');
  if (!authored) return [];

  return authored.tracks.flatMap((channel) => {
    const bone = channel.name.slice(0, channel.name.lastIndexOf('.'));
    const spec = FINS[bone];
    if (!spec) return [];

    return [
      {
        beatsWith: spec.beatsWith,
        side: finSide(bone),
        rate: spec.rate,
        clip: new THREE.AnimationClip(`fin:${bone}`, authored.duration, [
          finTrack(channel, spec.gain),
        ]),
      },
    ];
  });
}

export type Hinge = {
  axis: THREE.Vector3;
  angle: number;
  smooth: number;
  fromGaitRank: number;
};

export type Hinges = {
  fold?: Hinge;
  pitch?: Hinge;
};

export type Turn = Hinge & { progress: Spring<number> };

export const createTurn = (hinge: Hinge): Turn => ({
  ...hinge,
  progress: spring.create(0),
});

const worldPosition = (bone: THREE.Object3D) =>
  new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);

function rigAxes(bones: THREE.Bone[]) {
  const at = (name: string) => bones.find((bone) => bone.name === name);
  const snout = at(SNOUT_BONE);
  const tail = at(TAIL_BONE);
  const dorsal = at(DORSAL_BONE);
  const back = at(BACK_BONE);
  if (!snout || !tail || !dorsal || !back) return undefined;

  const tailAxis = worldPosition(tail).sub(worldPosition(snout)).normalize();
  const backAxis = worldPosition(dorsal)
    .sub(worldPosition(back))
    .projectOnPlane(tailAxis)
    .normalize();

  return { tailAxis, backAxis };
}

function findSkinnedMesh(scene: THREE.Object3D) {
  let found: THREE.SkinnedMesh | undefined;
  scene.traverse((object) => {
    const mesh = object as THREE.SkinnedMesh;
    if (!found && mesh.isSkinnedMesh) found = mesh;
  });
  return found;
}

function boneCentroid(mesh: THREE.SkinnedMesh, slot: number) {
  const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
  const centroid = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  let carried = 0;

  for (let v = 0; v < position.count; v++) {
    let weight = 0;
    for (let c = 0; c < 4; c++) {
      if (skinIndex.getComponent(v, c) === slot) {
        weight += skinWeight.getComponent(v, c);
      }
    }
    if (weight < 0.5) continue;
    centroid.add(vertex.fromBufferAttribute(position, v));
    carried++;
  }

  if (carried === 0) return undefined;
  return centroid.divideScalar(carried).applyMatrix4(mesh.matrixWorld);
}

export function finHinges(scene: THREE.Object3D): Map<string, Hinges> {
  const hinges = new Map<string, Hinges>();
  scene.updateMatrixWorld(true);

  const mesh = findSkinnedMesh(scene);
  if (!mesh) return hinges;

  const axes = rigAxes(mesh.skeleton.bones);
  if (!axes) return hinges;

  const pivot = new THREE.Vector3();
  const facing = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  for (const [name, spec] of Object.entries(FINS)) {
    const folds = spec.foldAmount !== undefined;
    const pitches = spec.pitchDegrees !== undefined;
    if (!folds && !pitches) continue;

    const slot = mesh.skeleton.bones.findIndex((bone) => bone.name === name);
    if (slot < 0) continue;

    const centroid = boneCentroid(mesh, slot);
    if (!centroid) continue;

    mesh.skeleton.bones[slot].matrixWorld.decompose(pivot, facing, scale);
    const blade = centroid.sub(pivot).normalize();
    const home = facing.clone().invert();
    const axisToward = (goal: THREE.Vector3) =>
      new THREE.Vector3()
        .crossVectors(blade, goal)
        .normalize()
        .applyQuaternion(home);

    hinges.set(name, {
      fold: !folds
        ? undefined
        : {
            axis: axisToward(axes.tailAxis),
            angle:
              Math.acos(clamp(blade.dot(axes.tailAxis), -1, 1)) *
              (spec.foldAmount ?? 0),
            smooth: spec.foldSeconds ?? FOLD_SMOOTH,
            fromGaitRank: gaitRankOf(spec.foldsFromGait ?? 'efficient'),
          },
      pitch: !pitches
        ? undefined
        : {
            axis: axisToward(axes.backAxis),
            angle: degreesToRadians(spec.pitchDegrees ?? 0),
            smooth: PITCH_SMOOTH,
            fromGaitRank: gaitRankOf('efficient'),
          },
    });
  }

  return hinges;
}

export function applyTurn(
  bone: THREE.Object3D,
  turn: Turn | undefined,
  gaitRank: number,
  target: number,
  dt: number,
  scratch: THREE.Quaternion,
) {
  if (!turn) return;

  const want = gaitRank >= turn.fromGaitRank ? target : 0;
  spring.damp(turn.progress, want, turn.smooth, dt);
  bone.quaternion.multiply(
    scratch.setFromAxisAngle(turn.axis, turn.angle * turn.progress.value),
  );
}
