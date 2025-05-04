import type { ComponentPropsWithoutRef, FC } from 'react';

import { Container } from '@react-three/uikit';

type Props = ComponentPropsWithoutRef<typeof Container> & {
  size?: number;
  roughness?: number;
};

export const Corner: FC<Props> = ({ size = 8, roughness = 2, ...props }) => {
  return (
    <Container
      positionType='absolute'
      width={size}
      height={size}
      pointerEvents='none'
      {...props}
    >
      <Container
        width={roughness}
        height='100%'
        backgroundColor='black'
        pointerEvents='none'
      />
      <Container
        width='100%'
        height={roughness}
        backgroundColor='black'
        pointerEvents='none'
      />
    </Container>
  );
};
