import type { ReactNode } from 'react';
import type { ReadonlySignal } from '@preact/signals-core';
import type { ConstructorRepresentation } from '@react-three/fiber';

export type PropsWithChildren = {
  children?: ReactNode;
};

export type CustomShaderRef<T> =
  T extends ConstructorRepresentation<infer U> ? U : never;

export type SchemaPropertyValue<T> = T | ReadonlySignal<T>;
