import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { Texture, Vector2 } from 'three';

import frag from './frag.glsl';
import vert from './vert.glsl';

export const BaseMaterial = shaderMaterial(
  {
    uTexture: new Texture(),
    uWindowResolution: new Vector2(),
  },
  vert,
  frag,
);

extend({ BaseMaterial });
