import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { Texture } from 'three';

import frag from './frag.glsl';
import vert from './vert.glsl';

export const ElemMaterial = shaderMaterial(
  {
    uTime: 0,
    uTexture: new Texture(),
  },
  vert,
  frag,
);

extend({ ElemMaterial });
