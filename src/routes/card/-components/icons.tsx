import type { RefObject } from 'react';
import type { Color, Group } from 'three';

import { Box } from '@react-three/drei';

import { EdgeMaterial } from '@/shaders/edge';

const columns = Array.from({ length: 3 }).map((_, i) => i - 1);

type Props = {
  ref?: RefObject<Group>;
  edgeColor?: Color;
};

export const Columns = ({ ref, edgeColor }: Props) => {
  return (
    <group ref={ref} scale={1.25}>
      {columns.map((i) => (
        <Box key={i} position={[i * 0.325, 0, 0]} args={[0.225, 1, 1]}>
          <edgeMaterial key={EdgeMaterial.key} uEdgeColor={edgeColor} />
        </Box>
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

export const Cubes = ({ ref, edgeColor }: Props) => {
  return (
    <group ref={ref} scale={0.6}>
      {Object.entries(cubes).map(([idx, pos]) => (
        <Box key={idx} position={pos} args={[1, 1, 1]}>
          <edgeMaterial key={EdgeMaterial.key} uEdgeColor={edgeColor} />
        </Box>
      ))}
    </group>
  );
};
