import type { RefObject } from 'react';
import type * as THREE from 'three';

import { EdgeMaterial } from '@/shaders/edge';

const columns = Array.from({ length: 3 }).map((_, i) => i);

type Props = {
  ref?: RefObject<THREE.Group>;
  edgeColor?: THREE.Color;
};

export const Columns = ({ edgeColor, ...props }: Props) => {
  return (
    <group {...props}>
      {columns.map((i) => (
        <mesh key={i} position={[i * 0.3, 0, 0]}>
          <boxGeometry args={[0.175, 1, 1]} />
          <edgeMaterial key={EdgeMaterial.key} uEdgeColor={edgeColor} />
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

export const Cubes = ({ edgeColor, ...props }: Props) => {
  return (
    <group {...props}>
      {Object.entries(cubes).map(([idx, pos]) => (
        <mesh key={idx} position={pos}>
          <boxGeometry args={[1, 1, 1]} />
          <edgeMaterial key={EdgeMaterial.key} uEdgeColor={edgeColor} />
        </mesh>
      ))}
    </group>
  );
};
