import type { ComponentPropsWithoutRef, RefObject } from 'react';
import type { SpringValue } from '@react-spring/three';

import { useImperativeHandle } from 'react';
import { useTexture } from '@react-three/drei';
import { useSpringSignal } from '@/utils/use-spring-signal';

import { Image as ImagePrimitive } from '@react-three/uikit';

export const Image = ({
  ref,
  src,
  ...props
}: ComponentPropsWithoutRef<typeof ImagePrimitive> & {
  ref?: RefObject<{
    adjustSize: () => void;
    reset: SpringValue<number>['start'];
  } | null>;
}) => {
  const texture = useTexture(src as string);

  const [aspectRatio, aspectRatioSpring] = useSpringSignal(10);

  useImperativeHandle(ref, () => ({
    adjustSize: () => {
      aspectRatioSpring.start(texture.image.width / texture.image.height);
    },
    reset: () => {
      return aspectRatioSpring.start(10);
    },
  }));

  return <ImagePrimitive src={src} aspectRatio={aspectRatio} {...props} />;
};
