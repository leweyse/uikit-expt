import type { ThreeElements } from '@react-three/fiber';

import { useThree } from '@react-three/fiber';

export const Mesh = ({ ref, children, ...props }: ThreeElements['mesh']) => {
  const size = useThree((state) => state.size);
  const viewport = useThree((state) => state.viewport);

  const width = size.width * viewport.dpr;
  const height = size.height * viewport.dpr;
  const ratio = width > height ? width / height : height / width;

  return (
    <mesh ref={ref} {...props} scale={7 / ratio}>
      <planeGeometry
        args={[
          width > height ? width / height : 1,
          width > height ? 1 : height / width,
          96,
          96,
        ]}
      />

      {children}
    </mesh>
  );
};
