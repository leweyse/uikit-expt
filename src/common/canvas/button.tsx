import type { ComponentProps } from 'react';
import type { UnionizeVariants } from '@pmndrs/uikit';
import type { ContainerProperties } from '@react-three/uikit';

import type { SchemaPropertyValue } from '@/types';

import { useMemo } from 'react';
import { computed, signal } from '@preact/signals-core';
import { Container as ContainerUIKit, withOpacity } from '@react-three/uikit';

import { borderRadius, colors } from '@/common/canvas/theme';
import {
  extractBooleanValue,
  extractStringValue,
  useComputedColorSpring,
  useComputedSpring,
} from '@/utils/use-spring-signal';

type ButtonVariantProps = Pick<
  ContainerProperties,
  'hover' | 'backgroundColor' | 'color' | 'borderWidth' | 'borderColor'
>;
type ButtonSizeProps = Pick<
  ContainerProperties,
  'height' | 'width' | 'paddingX' | 'paddingY'
>;

const _buttonVariants = {
  default: {
    hover: {
      backgroundColor: withOpacity(colors.primary, 0.8),
    },
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
  },
  destructive: {
    hover: {
      backgroundColor: withOpacity(colors.destructive, 0.8),
    },
    backgroundColor: colors.destructive,
    color: colors.destructiveForeground,
  },
  outline: {
    hover: {
      backgroundColor: colors.accent,
      color: colors.accentForeground,
    },
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.background,
  },
  secondary: {
    hover: {
      backgroundColor: withOpacity(colors.secondary, 0.8),
    },
    backgroundColor: colors.secondary,
    color: colors.secondaryForeground,
  },
  ghost: {
    hover: {
      backgroundColor: colors.accent,
      color: colors.accentForeground,
    },
  },
  link: {
    color: colors.primary,
  }, //TODO: underline-offset-4 hover:underline",
} satisfies Record<string, ButtonVariantProps>;
const buttonVariants = _buttonVariants as UnionizeVariants<
  typeof _buttonVariants
>;

const _buttonSizes = {
  default: { height: 40, paddingX: 16, paddingY: 8 },
  sm: { height: 36, paddingX: 12 },
  lg: { height: 42, paddingX: 32 },
  icon: { height: 40, width: 40 },
} satisfies Record<string, ButtonSizeProps>;
const buttonSizes = _buttonSizes as UnionizeVariants<typeof _buttonSizes>;

export type ButtonProperties = {
  variant?: SchemaPropertyValue<keyof typeof buttonVariants>;
  size?: SchemaPropertyValue<keyof typeof buttonSizes>;
  disabled?: SchemaPropertyValue<boolean>;
};

type Props = ComponentProps<typeof ContainerUIKit> & ButtonProperties;

export const Button = (props: Props) => {
  const isHovered = useMemo(() => signal(false), []);

  const width = useMemo(() => {
    return computed(() => {
      const size = extractStringValue(props.size ?? 'default');
      return buttonSizes[size]?.width;
    });
  }, []);

  const height = useMemo(() => {
    return computed(() => {
      const size = extractStringValue(props.size ?? 'default');
      return buttonSizes[size]?.height;
    });
  }, []);

  const sizeProps = useMemo(() => {
    return computed(() => {
      const size = extractStringValue(props.size ?? 'default');
      return buttonSizes[size];
    });
  }, []);

  const paddingX = useMemo(() => {
    return computed(() => sizeProps.value?.paddingX);
  }, []);

  const paddingY = useMemo(() => {
    return computed(() => sizeProps.value?.paddingY);
  }, []);

  const backgroundColor = useComputedColorSpring(() => {
    const variant =
      buttonVariants[extractStringValue(props.variant ?? 'default')];

    if (isHovered.value) {
      const variantColor =
        variant?.hover?.backgroundColor ?? variant?.backgroundColor;
      return variantColor?.value;
    }

    return variant?.backgroundColor?.value;
  });

  const color = useComputedColorSpring(() => {
    const variant =
      buttonVariants[extractStringValue(props.variant ?? 'default')];

    if (isHovered.value) {
      const variantColor = variant?.hover?.color ?? variant?.color;
      return variantColor?.value;
    }

    return variant?.color?.value;
  });

  const borderW = useMemo(() => {
    return computed(() => {
      const variant = extractStringValue(props.variant ?? 'default');
      return buttonVariants[variant]?.borderWidth;
    });
  }, []);

  const borderColor = useMemo(() => {
    return computed(() => {
      const variant = extractStringValue(props.variant ?? 'default');
      return buttonVariants[variant]?.borderColor?.value;
    });
  }, []);

  const opacity = useComputedSpring(
    () => {
      const disabled = extractBooleanValue(props.disabled ?? false);
      return disabled ? 0.5 : 1;
    },
    { deps: [typeof props.disabled] },
  );

  const cursor = useMemo(() => {
    return computed(() => {
      const disabled = extractBooleanValue(props.disabled ?? false);
      return disabled ? 'default' : 'pointer';
    });
  }, [props.disabled]);

  return (
    <ContainerUIKit
      flexDirection='row'
      alignItems='center'
      justifyContent='center'
      width={width}
      height={height}
      paddingLeft={paddingX}
      paddingRight={paddingX}
      paddingTop={paddingY}
      paddingBottom={paddingY}
      backgroundColor={backgroundColor}
      color={color}
      fontSize={14}
      lineHeight='20px'
      fontWeight='medium'
      wordBreak='keep-all'
      borderTopWidth={borderW}
      borderRightWidth={borderW}
      borderBottomWidth={borderW}
      borderLeftWidth={borderW}
      borderColor={borderColor}
      borderRadius={borderRadius.md}
      opacity={opacity}
      cursor={cursor}
      {...props}
      onHoverChange={(hovered) => {
        isHovered.value = hovered;

        if (typeof props.onHoverChange === 'function') {
          props.onHoverChange(hovered);
        }
      }}
      {...{
        '*': {
          borderColor: colors.border,
          ...props['*'],
        },
      }}
    />
  );
};

export { buttonSizes, buttonVariants };
