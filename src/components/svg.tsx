import type { FC } from 'react';
import type { Color } from 'three';

import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

import { themes } from '@/common/themes';
import gridFrag from '@/shaders/grid/frag.glsl';
import gridVert from '@/shaders/grid/vert.glsl';

const GridMaterial = shaderMaterial(
  {
    edgeColor: themes.neutral.light.foreground,
  },
  gridVert,
  gridFrag,
);

extend({ GridMaterial });

const columns = Array.from({ length: 3 }).map((_, i) => i);

type Props = {
  edgeColor?: Color;
};

export const Columns: FC<Props> = ({ edgeColor }) => {
  return (
    <group rotation={[Math.PI / 4, Math.PI / 4, 0]}>
      {columns.map((i) => (
        <mesh key={i} position={[i * 0.3, 0, 0]}>
          <boxGeometry args={[0.175, 1, 1]} />
          {/* @ts-expect-error - not sure how to type this */}
          <gridMaterial key={GridMaterial.key} edgeColor={edgeColor} />
        </mesh>
      ))}
    </group>
  );
};

const cubes: Record<number, [number, number, number]> = {
  0: [-1, 0, 0],
  1: [1, 0, 0],
  2: [0, 0, 1],
  3: [0, 0, -1],
  4: [0, 1, 0],
  5: [0, -1, 0],
};

export const Cubes: FC<Props> = ({ edgeColor }) => {
  return (
    <group rotation={[Math.PI / 4, Math.PI / 4, 0]}>
      {Object.entries(cubes).map(([idx, pos]) => (
        <mesh key={idx} position={pos}>
          <boxGeometry args={[1, 1, 1]} />
          {/* @ts-expect-error - not sure how to type this */}
          <gridMaterial key={GridMaterial.key} edgeColor={edgeColor} />
        </mesh>
      ))}
    </group>
  );
};
