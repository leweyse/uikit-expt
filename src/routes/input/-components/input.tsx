import type { FC } from 'react';

import { useMemo } from 'react';
import { computed, type ReadonlySignal } from '@preact/signals-core';
import {
  Container,
  Text,
  Textarea,
  type TextareaProperties,
  withOpacity,
} from '@react-three/uikit';

import { colors } from '@/common/canvas/theme';

export const Input: FC<
  TextareaProperties & {
    value: ReadonlySignal<string>;
  }
> = ({
  autocomplete,
  panelMaterialClass,
  value,
  defaultValue,
  onValueChange,
  tabIndex,
  disabled,
  placeholder,
  type,
  borderRadius,
  ...props
}) => {
  const displayPlaceholder = useMemo(() => {
    return computed(() => {
      if (value.value.length > 0) return 'none';
      return 'initial';
    });
  }, [value]);

  return (
    <Container
      width='100%'
      height='100%'
      paddingX={10}
      paddingY={8}
      positionType='relative'
      {...props}
      {...{
        '*': {
          height: '100%',
          width: '100%',
          paddingX: 6,
          paddingY: 8,
          lineHeight: 1,
          ...props['*'],
        },
      }}
    >
      <Textarea
        autocomplete={autocomplete}
        borderRadius={borderRadius}
        borderColor={colors.input}
        focus={{
          borderColor: colors.ring,
        }}
        panelMaterialClass={panelMaterialClass}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        tabIndex={tabIndex}
        disabled={disabled}
        type={type}
      />

      {placeholder != null && (
        <Container
          display={displayPlaceholder}
          positionType='absolute'
          inset={0}
          pointerEvents='none'
          {...{
            '*': {
              color: withOpacity(colors.mutedForeground, 0.6),
            },
          }}
        >
          <Text>{placeholder}</Text>
        </Container>
      )}
    </Container>
  );
};
