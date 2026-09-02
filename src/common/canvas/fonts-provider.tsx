import type { PropsWithChildren } from '@/types';

import { Container } from '@react-three/uikit';

export const FontsProvider = ({ children }: PropsWithChildren) => {
  return (
    <Container
      display='contents'
      fontFamilies={{
        satoshi: {
          light: '/satoshi/satoshi-uikit.json',
          normal: '/satoshi/satoshi-uikit.json',
          medium: '/satoshi/satoshi-uikit.json',
        },
        heming: {
          light: '/heming/heming-uikit.json',
          normal: '/heming/heming-uikit.json',
          medium: '/heming/heming-uikit.json',
        },
      }}
    >
      {children}
    </Container>
  );
};
