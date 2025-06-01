import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { Texture } from 'three';

import frag from './frag.glsl';
import vert from './vert.glsl';

export const WrapMaterial = shaderMaterial(
  {
    uTime: 0,
    uProgress: 0,
    uProgress2: 0,
    uBackFace: 0 as 0 | 1,
    uTexture: new Texture(),
  },
  vert,
  frag,
);

extend({ WrapMaterial });
