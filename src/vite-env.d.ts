/// <reference types="vite/client" />
/// <reference types="vite-plugin-glsl/ext" />

import type { ReactThreeFiber } from '@react-three/fiber';

import { EdgeMaterial } from '@/shaders/edge';
import { ElemMaterial } from '@/shaders/elem';
import { BaseMaterial } from '@/shaders/base';

declare module '@react-three/fiber' {
  interface ThreeElements {
    baseMaterial: ReactThreeFiber.ElementProps<typeof BaseMaterial>;
    edgeMaterial: ReactThreeFiber.ElementProps<typeof EdgeMaterial>;
    elemMaterial: ReactThreeFiber.ElementProps<typeof ElemMaterial>;
  }
}
