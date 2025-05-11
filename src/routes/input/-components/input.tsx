import { type ReactNode, type RefAttributes, useMemo, useState } from 'react';
import { computed } from '@preact/signals-core';
import {
  type InputProperties as BaseInputProperties,
  type ContainerRef,
  DefaultProperties,
  Input as InputImpl,
  type InputInternals,
  Text,
} from '@react-three/uikit';

import { colors } from '@/common/canvas/theme';

export type InputProperties = BaseInputProperties & {
  placeholder?: string;
};

export const Input: (
  props: InputProperties & RefAttributes<ContainerRef>,
) => ReactNode = ({
  autocomplete,
  panelMaterialClass,
  value,
  defaultValue,
  onValueChange,
  tabIndex,
  disabled,
  placeholder,
  type,
  multiline = false,
  borderRadius,
  ...props
}) => {
  const [internal, setInternal] = useState<InputInternals | null>(null);

  const placeholderOpacity = useMemo(() => {
    if (internal == null) {
      return undefined;
    }
    return computed(() => (internal.current.value.length > 0 ? 0 : undefined));
  }, [internal]);

  return (
    <DefaultProperties
      fontSize={14}
      height='100%'
      width='100%'
      borderWidth={1}
      paddingX={12}
      paddingY={8}
      lineHeight={20}
      opacity={disabled ? 0.5 : undefined}
      backgroundOpacity={disabled ? 0.5 : undefined}
      {...props}
    >
      <InputImpl
        ref={setInternal}
        autocomplete={autocomplete}
        borderRadius={borderRadius}
        borderColor={colors.input}
        focus={{
          borderColor: colors.ring,
        }}
        panelMaterialClass={panelMaterialClass}
        multiline={multiline}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        tabIndex={tabIndex}
        disabled={disabled}
        type={type}
      />
      {placeholder != null && (
        <Text
          color={colors.mutedForeground}
          opacity={placeholderOpacity}
          borderOpacity={0}
          inset={0}
          positionType='absolute'
        >
          {placeholder}
        </Text>
      )}
    </DefaultProperties>
  );
};
