import type { Color } from 'three';

import { computed, type ReadonlySignal, signal } from '@preact/signals-core';
import {
  DefaultProperties,
  type DefaultPropertiesProperties,
} from '@react-three/uikit';

import { type Theme, themes } from '@/common/themes';

export const baseBorderRadius = signal(8);

export const borderRadius = {
  lg: baseBorderRadius,
  md: computed(() => baseBorderRadius.value - 2),
  sm: computed(() => baseBorderRadius.value - 4),
};

export const themeName = signal<Theme>('neutral');

export const colors = {} as {
  -readonly [Key in keyof (typeof themes)['slate']['light']]: ReadonlySignal<Color>;
};
for (const anyKey in themes.slate.light) {
  const key = anyKey as keyof (typeof themes)['slate']['light'];
  colors[key] = computed<Color>(() => themes[themeName.value].light[key]);
}

export function Defaults(props: DefaultPropertiesProperties) {
  return (
    <DefaultProperties
      scrollbarColor={colors.foreground}
      scrollbarBorderRadius={4}
      scrollbarOpacity={0.3}
      lineHeight='150%'
      borderColor={colors.border}
      color={colors.foreground}
      {...props}
    />
  );
}
