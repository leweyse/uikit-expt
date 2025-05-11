import { forwardRef, type ReactNode, type RefAttributes } from 'react';
import {
  type AllOptionalProperties,
  Container,
  type ContainerProperties,
  type ContainerRef,
  DefaultProperties,
} from '@react-three/uikit';

import { borderRadius, colors } from '@/common/canvas/theme';

const buttonVariants = {
  default: {
    containerHoverProps: {
      backgroundOpacity: 0.9,
    },
    containerProps: {
      backgroundColor: colors.primary,
    },
    defaultProps: {
      color: colors.primaryForeground,
    },
  },
  destructive: {
    containerHoverProps: {
      backgroundOpacity: 0.9,
    },
    containerProps: {
      backgroundColor: colors.destructive,
    },
    defaultProps: {
      color: colors.destructiveForeground,
    },
  },
  outline: {
    containerHoverProps: {
      backgroundColor: colors.accent,
    },
    containerProps: {
      borderWidth: 1,
      borderColor: colors.input,
      backgroundColor: colors.background,
    },
  },
  secondary: {
    containerHoverProps: {
      backgroundOpacity: 0.8,
    },
    containerProps: {
      backgroundColor: colors.secondary,
    },
    defaultProps: {
      color: colors.secondaryForeground,
    },
  },
  ghost: {
    containerHoverProps: {
      backgroundColor: colors.accent,
    },
    defaultProps: {},
  },
  link: {
    containerProps: {},
    defaultProps: {
      color: colors.primary,
    },
  },
};

const buttonSizes = {
  default: { height: 40, paddingX: 16, paddingY: 8 },
  sm: { height: 36, paddingX: 12 },
  lg: { height: 42, paddingX: 32 },
  icon: { height: 40, width: 40 },
} satisfies { [Key in string]: ContainerProperties };

export type ButtonProperties = ContainerProperties & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  disabled?: boolean;
};

export const Button: (
  props: ButtonProperties & RefAttributes<ContainerRef>,
) => ReactNode = forwardRef(
  (
    {
      children,
      variant = 'default',
      size = 'default',
      disabled = false,
      hover,
      ...props
    },
    ref,
  ) => {
    const {
      containerProps,
      defaultProps,
      containerHoverProps,
    }: {
      containerHoverProps?: ContainerProperties['hover'];
      containerProps?: Omit<ContainerProperties, 'hover'>;
      defaultProps?: AllOptionalProperties;
    } = buttonVariants[variant];
    const sizeProps = buttonSizes[size];

    return (
      <Container
        borderRadius={borderRadius.md}
        alignItems='center'
        justifyContent='center'
        {...containerProps}
        {...sizeProps}
        borderOpacity={disabled ? 0.5 : undefined}
        backgroundOpacity={disabled ? 0.5 : undefined}
        cursor={disabled ? undefined : 'pointer'}
        flexDirection='row'
        hover={{
          ...containerHoverProps,
          ...hover,
        }}
        ref={ref}
        {...props}
      >
        <DefaultProperties
          fontSize={14}
          lineHeight={20}
          fontWeight='medium'
          wordBreak='keep-all'
          {...defaultProps}
          opacity={disabled ? 0.5 : undefined}
        >
          {children}
        </DefaultProperties>
      </Container>
    );
  },
);
