import type { ReadonlySignal } from '@preact/signals-core';
import type { Color } from 'three';

import type { Theme } from '@/common/themes';

import { computed, signal } from '@preact/signals-core';

import { themes } from '@/common/themes';

export const baseBorderRadius = signal(8);

export const borderRadius = {
  lg: baseBorderRadius,
  md: computed(() => baseBorderRadius.value - 2),
  sm: computed(() => baseBorderRadius.value - 4),
};

export const themeName = signal<Theme>('neutral');

export const colors = {} as {
  -readonly [Key in keyof (typeof themes)['neutral']['light']]: ReadonlySignal<Color>;
};
for (const anyKey in themes.neutral.light) {
  const key = anyKey as keyof (typeof themes)['neutral']['light'];
  colors[key] = computed<Color>(() => themes[themeName.value].light[key]);
}
