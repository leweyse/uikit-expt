/// <reference types="vite/client" />
/// <reference types="vite-plugin-glsl/ext" />

import type { ReactThreeFiber } from '@react-three/fiber';

import { EdgeMaterial } from '@/shaders/edge';
import { BaseMaterial } from '@/shaders/base';

import { InputFirstMaterial } from '@/routes/input/-shaders/first';
import { InputSecondMaterial } from '@/routes/input/-shaders/second';

declare module '@react-three/fiber' {
  interface ThreeElements {
    baseMaterial: ReactThreeFiber.ElementProps<typeof BaseMaterial>;
    edgeMaterial: ReactThreeFiber.ElementProps<typeof EdgeMaterial>;

    inputFirstMaterial: ReactThreeFiber.ElementProps<typeof InputFirstMaterial>;
    inputSecondMaterial: ReactThreeFiber.ElementProps<
      typeof InputSecondMaterial
    >;
  }
}
