import type { ThreeElements } from '@react-three/fiber';

import { useThree } from '@react-three/fiber';

type Props = Omit<ThreeElements['mesh'], 'scale'>;

export const Mesh = ({ ref, children, ...props }: Props) => {
  const size = useThree((state) => state.size);

  return (
    <mesh ref={ref} {...props}>
      <planeGeometry
        args={[
          size.width > size.height ? size.width / size.height : 1,
          size.width > size.height ? 1 : size.height / size.width,
          120,
          120,
        ]}
      />

      {children}
    </mesh>
  );
};
