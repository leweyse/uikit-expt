import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

import { themes } from '@/common/themes';

import frag from './frag.glsl';
import vert from './vert.glsl';

export const EdgeMaterial = shaderMaterial(
  {
    uStrength: 1,
    uEdgeColor: themes.neutral.light.foreground,
  },
  vert,
  frag,
  (material) => {
    const target = material as unknown as { color: THREE.Color } | undefined;

    if (target != null) {
      target.color ??= new THREE.Color();
    }
  },
);

extend({ EdgeMaterial });
