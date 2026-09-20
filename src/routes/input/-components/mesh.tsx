import type { ThreeElements } from '@react-three/fiber';

import { useThree } from '@react-three/fiber';

type Props = Omit<ThreeElements['mesh'], 'scale'>;

const SCALE = 0.9;
const MAX_WIDTH = 768;

export const Mesh = ({ ref, children, ...props }: Props) => {
  const aspect = useThree((state) => state.viewport.aspect);
  const sizeWidth = useThree((state) => state.size.width);
  const viewportWidth = useThree((state) => state.viewport.width);

  const width =
    (sizeWidth > MAX_WIDTH
      ? (viewportWidth / sizeWidth) * MAX_WIDTH
      : viewportWidth) * SCALE;
  const height = width / aspect;

  return (
    <mesh ref={ref} {...props}>
      <planeGeometry args={[width, height, 128, 128]} />
      {children}
    </mesh>
  );
};
