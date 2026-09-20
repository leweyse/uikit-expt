import type { DependencyList } from 'react';
import type { ColorRepresentation } from '@pmndrs/uikit';
import type { ReadonlySignal } from '@preact/signals-core';

import { useEffect, useMemo, useRef } from 'react';
import { computed, effect, signal } from '@preact/signals-core';
import { type SpringUpdate, useSpringValue } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const extractStringValue = <T extends string>(
  signal: ReadonlySignal<T> | T,
) => {
  if (typeof signal === 'string') return signal;
  return signal.value;
};

export const extractBooleanValue = <T extends boolean>(
  signal: ReadonlySignal<T> | T,
) => {
  if (typeof signal === 'boolean') return signal;
  return signal.value;
};

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

const colorHelper = new THREE.Color();
const rgbHelper = { r: 0, g: 0, b: 0 };

const toChannels = (value: ColorRepresentation): number[] => {
  const color = Array.isArray(value)
    ? colorHelper.setRGB(value[0], value[1], value[2])
    : colorHelper.set(value);

  const { r, g, b } = color.getRGB(rgbHelper, THREE.SRGBColorSpace);

  return [r, g, b, Array.isArray(value) ? (value[3] ?? 1) : 1];
};

const fromChannels = ([r, g, b]: number[], target: THREE.Color) => {
  return target.setRGB(r, g, b, THREE.SRGBColorSpace);
};

const toColorTuple = (
  [r, g, b, a]: number[],
  target: THREE.Vector4Tuple,
): THREE.Vector4Tuple => {
  colorHelper.setRGB(r, g, b, THREE.SRGBColorSpace);

  target[0] = colorHelper.r;
  target[1] = colorHelper.g;
  target[2] = colorHelper.b;
  target[3] = a;

  return target;
};

export const useSpringColorSignal = (
  initial: ColorRepresentation | undefined,
  springOpts?: SpringUpdate<number[]>,
) => {
  const __signal = useMemo(
    () =>
      signal(
        initial == null
          ? undefined
          : fromChannels(toChannels(initial), new THREE.Color()),
      ),
    [],
  );

  const __spring = useSpringValue<number[]>(
    (initial == null ? [0, 0, 0, 1] : toChannels(initial)) as never,
    springOpts,
  );

  const buffers = useMemo(
    () => [new THREE.Color(), new THREE.Color()] as const,
    [],
  );
  const current = useRef(0);

  const empty = useRef(initial == null);
  const published = useRef(true);

  useFrame(() => {
    if (empty.current) return;

    const { idle } = __spring;
    if (idle && published.current) return;

    current.current ^= 1;
    __signal.value = fromChannels(__spring.get(), buffers[current.current]);
    published.current = idle;
  });

  const __api = useMemo(
    () => ({
      start: (
        to: ColorRepresentation | undefined,
        opts?: SpringUpdate<number[]>,
      ) => {
        if (to == null) {
          empty.current = true;
          __signal.value = undefined;
          return;
        }

        if (empty.current) {
          empty.current = false;
          published.current = false;
          __spring.set(toChannels(to));
          return;
        }

        __spring.start(toChannels(to), opts);

        if (!__spring.idle) published.current = false;
      },
      set: (to: ColorRepresentation | undefined) => {
        if (to == null) {
          empty.current = true;
          __signal.value = undefined;
          return;
        }

        empty.current = false;
        published.current = false;
        __spring.set(toChannels(to));
      },
      spring: __spring,
    }),
    [],
  );

  return [__signal as ReadonlySignal<THREE.Color | undefined>, __api] as const;
};

type ComputedSpringOpts<T> = SpringUpdate<T> & { deps?: DependencyList };

export const useComputedSpring = <T extends number | undefined>(
  compute: () => T,
  { deps = [], ...springOpts }: ComputedSpringOpts<number> = {},
) => {
  const computeRef = useRef(compute);
  computeRef.current = compute;

  const target = useMemo(() => computed(() => computeRef.current()), deps);
  const initial = target.peek();

  const __signal = useMemo(() => signal<number | undefined>(initial), []);
  const __spring = useSpringValue(initial ?? 0, springOpts);

  const empty = useRef(initial == null);
  const published = useRef(true);

  useFrame(() => {
    if (empty.current) return;

    const { idle } = __spring;
    if (idle && published.current) return;

    __signal.value = __spring.get();
    published.current = idle;
  });

  useEffect(
    () =>
      effect(() => {
        const to = target.value;

        if (to == null) {
          empty.current = true;
          __signal.value = undefined;
          return;
        }

        if (empty.current) {
          empty.current = false;
          published.current = false;
          __spring.set(to);
          return;
        }

        __spring.start(to);

        if (!__spring.idle) published.current = false;
      }),
    [target, __signal, __spring],
  );

  return __signal as ReadonlySignal<T>;
};

export const useComputedColorSpring = (
  compute: () => ColorRepresentation | undefined,
  { deps = [], ...springOpts }: ComputedSpringOpts<number[]> = {},
) => {
  const computeRef = useRef(compute);
  computeRef.current = compute;

  const target = useMemo(() => computed(() => computeRef.current()), deps);
  const initial = target.peek();

  const __signal = useMemo(
    () =>
      signal<THREE.Vector4Tuple | undefined>(
        initial == null
          ? undefined
          : toColorTuple(toChannels(initial), [0, 0, 0, 1]),
      ),
    [],
  );

  const __spring = useSpringValue<number[]>(
    (initial == null ? [0, 0, 0, 1] : toChannels(initial)) as never,
    springOpts,
  );

  const buffers = useMemo<THREE.Vector4Tuple[]>(
    () => [
      [0, 0, 0, 1],
      [0, 0, 0, 1],
    ],
    [],
  );
  const current = useRef(0);

  const empty = useRef(initial == null);
  const published = useRef(true);

  useFrame(() => {
    if (empty.current) return;

    const { idle } = __spring;
    if (idle && published.current) return;

    current.current ^= 1;
    __signal.value = toColorTuple(__spring.get(), buffers[current.current]);
    published.current = idle;
  });

  useEffect(
    () =>
      effect(() => {
        const to = target.value;

        if (to == null) {
          empty.current = true;
          __signal.value = undefined;
          return;
        }

        if (empty.current) {
          empty.current = false;
          published.current = false;
          __spring.set(toChannels(to));
          return;
        }

        __spring.start(toChannels(to));

        if (!__spring.idle) published.current = false;
      }),
    [target, __signal, __spring],
  );

  return __signal as ReadonlySignal<THREE.Vector4Tuple | undefined>;
};
