import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

import frag from './frag.glsl';
import vert from './vert.glsl';

export const BaseMaterial = shaderMaterial({}, vert, frag);

extend({ BaseMaterial });
