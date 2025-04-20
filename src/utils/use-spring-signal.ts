import { useMemo } from 'react';
import { signal } from '@preact/signals-core';
import { type SpringUpdate, useSpringValue } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';

export const useSpringSignal = <T>(
  initial: T,
  springOpts?: SpringUpdate<T>,
) => {
  const __signal = useMemo(() => signal(initial), [initial]);
  const __spring = useSpringValue(initial as Exclude<T, object>, springOpts);

  // Sync the spring value with the signal.
  useFrame(() => {
    __signal.value = __spring.get();
  });

  return [__signal, __spring] as const;
};
