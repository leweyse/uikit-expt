/// <reference types="vite/client" />
/// <reference types="vite-plugin-glsl/ext" />

import type { ReactThreeFiber } from '@react-three/fiber';

import type { BaseMaterial } from '@/shaders/base';
import type { EdgeMaterial } from '@/shaders/edge';
import type { WrapMaterial } from '@/shaders/wrap';

declare module '@react-three/fiber' {
  interface ThreeElements {
    baseMaterial: ReactThreeFiber.ElementProps<typeof BaseMaterial>;
    edgeMaterial: ReactThreeFiber.ElementProps<typeof EdgeMaterial>;
    wrapMaterial: ReactThreeFiber.ElementProps<typeof WrapMaterial>;
  }
}
