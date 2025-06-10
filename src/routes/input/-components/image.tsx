import type { ComponentPropsWithoutRef, RefObject } from 'react';
import type { SpringValue } from '@react-spring/three';

import { useImperativeHandle } from 'react';
import { Image as ImagePrimitive } from '@react-three/uikit';

import { useSpringSignal } from '@/utils/use-spring-signal';

export const Image = ({
  ref,
  src,
  srcAspectRatio,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof ImagePrimitive>, 'aspectRatio'> & {
  srcAspectRatio: number;
  ref?: RefObject<{
    adjustSize: () => void;
    reset: SpringValue<`${number}%`>['start'];
  } | null>;
}) => {
  const [maxHeight, maxHeightSpring] = useSpringSignal('0%' as `${number}%`);
  const [aspectRatio, aspectRatioSpring] = useSpringSignal(10);

  useImperativeHandle(ref, () => ({
    adjustSize: () => {
      maxHeightSpring.start('100%');
      aspectRatioSpring.start(srcAspectRatio);
    },
    reset: () => {
      aspectRatioSpring.start(10, {
        config: {
          mass: 10,
          tension: 200,
          friction: 72,
          clamp: true,
        },
      });
      return maxHeightSpring.start('0%');
    },
  }));

  return (
    <ImagePrimitive
      src={src}
      height='100%'
      minHeight={48}
      maxHeight={maxHeight}
      aspectRatio={aspectRatio}
      objectFit='cover'
      {...props}
    />
  );
};
