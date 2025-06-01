import type { ReactNode } from 'react';
import type { ConstructorRepresentation } from '@react-three/fiber';

export type PropsWithChildren = {
  children?: ReactNode;
};

export type CustomShaderRef<T> = T extends ConstructorRepresentation<infer U>
  ? U
  : never;
