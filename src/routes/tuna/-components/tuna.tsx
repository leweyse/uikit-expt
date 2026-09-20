import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import {
  FIELD_ASPECT,
  FIELD_HALF_HEIGHT,
  FIELD_HALF_HEIGHT_MAX,
  FIELD_HALF_WIDTH,
  FIELD_HALF_WIDTH_MIN,
  resizeField,
  trackCamera,
} from '../-utils/field';
import { buildFinClips, finHinges } from '../-utils/fins';
import { step } from '../-utils/path';
import {
  buildRig,
  disposeRig,
  drawTuna,
  restoreMixerPose,
} from '../-utils/rig';
import { createSchool, renew, seedSchool } from '../-utils/school';

const MODEL = '/models/tuna-lod.glb';

const MAX_STEP = 1 / 20;
const FIELD_MARGIN = 0.82;
const FIELD_PAD_WIDE = 10;
const FIELD_PAD_TALL = 12;

export const TunaSchool = () => {
  const viewport = useThree((state) => state.viewport);
  const { scene, animations } = useGLTF(MODEL);

  const school = useMemo(() => createSchool(), []);
  const clips = useMemo(() => buildFinClips(animations), [animations]);
  const hinges = useMemo(() => finHinges(scene), [scene]);

  const rigs = useMemo(
    () =>
      school.tuna.map((tuna) => buildRig(scene, clips, hinges, tuna.frames)),
    [school, scene, clips, hinges],
  );

  useLayoutEffect(
    () => () => {
      for (const rig of rigs) disposeRig(rig);
    },
    [rigs],
  );

  useLayoutEffect(
    () => () => {
      for (const tuna of school.tuna) tuna.frames.texture.dispose();
    },
    [school],
  );

  const fit = useMemo(() => {
    const narrow = Math.min(1, viewport.width / viewport.height / FIELD_ASPECT);
    const wide = Math.max(FIELD_HALF_WIDTH_MIN, FIELD_HALF_WIDTH * narrow);
    const tall = Math.min(FIELD_HALF_HEIGHT_MAX, FIELD_HALF_HEIGHT / narrow);
    return Math.min(
      (viewport.width * FIELD_MARGIN) / (2 * wide + FIELD_PAD_WIDE),
      (viewport.height * FIELD_MARGIN) / (2 * tall + FIELD_PAD_TALL),
    );
  }, [viewport]);

  useLayoutEffect(() => {
    resizeField(
      school.field,
      viewport.width / (2 * fit),
      viewport.height / (2 * fit),
    );
  }, [school, viewport, fit]);

  useLayoutEffect(() => {
    seedSchool(school);
  }, [school]);

  const groupRef = useRef<THREE.Group>(null);

  const scratch = useMemo(
    () => ({
      camera: new THREE.Vector3(),
      clip: new THREE.Matrix4(),
      screenUp: new THREE.Vector3(),
      facing: new THREE.Quaternion(),
      overlay: new THREE.Quaternion(),
    }),
    [],
  );

  useFrame((state, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(rawDelta, MAX_STEP);
    const { camera, clip, screenUp, facing, overlay } = scratch;

    camera.copy(state.camera.position);
    group.worldToLocal(camera);
    clip
      .multiplyMatrices(
        state.camera.projectionMatrix,
        state.camera.matrixWorldInverse,
      )
      .multiply(group.matrixWorld);
    trackCamera(school.field, camera, clip.elements);

    group.getWorldQuaternion(facing).invert();
    screenUp.set(0, 1, 0).applyQuaternion(facing);

    renew(school);

    for (let i = 0; i < school.tuna.length; i++) {
      const tuna = school.tuna[i];
      const rig = rigs[i];

      rig.root.visible = tuna.isLive;
      if (!tuna.isLive) continue;

      const arc = step(tuna, school.field, school.tuna, dt);

      restoreMixerPose(rig);
      rig.mixer.update(dt);
      drawTuna(rig, tuna, arc, screenUp, dt, overlay);
    }
  });

  return (
    <group ref={groupRef} scale={fit} rotation={[Math.PI / 2, 0, 0]}>
      {rigs.map((rig) => (
        <primitive key={rig.root.uuid} object={rig.root} />
      ))}
    </group>
  );
};

useGLTF.preload(MODEL);
