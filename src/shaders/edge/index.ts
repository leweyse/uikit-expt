import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

import { themes } from '@/common/themes';

import frag from './frag.glsl';
import vert from './vert.glsl';

export const EdgeMaterial = shaderMaterial(
  {
    edgeColor: themes.neutral.light.foreground,
  },
  vert,
  frag,
);

extend({ EdgeMaterial });
