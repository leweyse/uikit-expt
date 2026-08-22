import type { ComponentProps, FC } from 'react';
import type { SpringValue } from '@react-spring/three';
import type { Color } from 'three';

import type { PropsWithChildren } from '@/types';

import { createContext, useContext, useMemo } from 'react';
import { computed } from '@preact/signals-core';
import { animated } from '@react-spring/three';
import { Container, withOpacity } from '@react-three/uikit';
import tunnel from 'tunnel-rat';

import { FontsProvider } from '@/common/canvas/fonts-provider';
import { colors } from '@/common/canvas/theme';
import { themes } from '@/common/themes';
import { useSpringSignal } from '@/utils/use-spring-signal';

import { Corner } from './corner';

type TunnelsContext = {
  label: ReturnType<typeof tunnel>;
  description: ReturnType<typeof tunnel>;
};

const TunnelsProvider = createContext<Partial<TunnelsContext>>({});

const useTunnels = () => {
  const ctx = useContext(TunnelsProvider);

  if (!ctx) {
    throw new Error('useTunnels must be used within a TunnelsProvider');
  }

  if (!ctx.label || !ctx.description) {
    throw new Error('tunnels must be provided');
  }

  return ctx as TunnelsContext;
};

type IconProviderContext = {
  edgeColor: SpringValue<Color>;
};

const IconProvider = createContext<Partial<IconProviderContext>>({});

export const useCardIcon = () => {
  const ctx = useContext(IconProvider);

  if (!ctx) {
    throw new Error('useCardIcon must be used within a IconProvider');
  }

  return ctx as IconProviderContext;
};

const AnimatedIconProvider = animated(IconProvider.Provider);

type CardInternalProps = Omit<
  ComponentProps<typeof Container>,
  'onPointerOver' | 'onPointerLeave'
>;

const CardInternal: FC<CardInternalProps> = ({ children, ...props }) => {
  const { label, description } = useTunnels();

  const [inset, insetSpring] = useSpringSignal(0);
  const [transformScale, transformScaleSpring] = useSpringSignal(0.3);
  const [transformRotate, transformRotateSpring] = useSpringSignal(0);
  const transformRotateWOffset = useMemo(
    () => computed(() => transformRotate.value + 45),
    [transformRotate],
  );
  const [hoverWidth, hoverWidthSpring] = useSpringSignal(
    '100%' as `${number}%`,
  );

  const [_, edgeColorSpring] = useSpringSignal(themes.neutral.light.primary);

  return (
    <Container
      cursor='pointer'
      flexDirection='row'
      alignItems='flex-start'
      gap={20}
      width='100%'
      padding={28}
      borderRadius={20}
      backgroundColor='transparent'
      {...props}
      onPointerOver={() => {
        edgeColorSpring.start(themes.violet.light.primary);

        insetSpring.start(-6);
        transformScaleSpring.start(0.47);
        hoverWidthSpring.start('0%');

        transformRotateSpring.start(360, {
          loop: true,
          config: { duration: 5000 },
        });
      }}
      onPointerLeave={() => {
        edgeColorSpring.start(themes.neutral.light.primary);

        insetSpring.start(0);
        transformScaleSpring.start(0.3);
        hoverWidthSpring.start('100%');

        transformRotateSpring.start(0, {
          loop: false,
          config: { duration: undefined },
        });
      }}
    >
      <Container
        display='flex'
        alignItems='center'
        justifyContent='center'
        positionType='relative'
        flexShrink={0}
        width={64}
        height={64}
        borderWidth={1}
        borderColor={withOpacity(colors.border, 0.8)}
      >
        <Container positionType='absolute' inset={inset}>
          <Corner positionTop={-1} positionLeft={-1} transformRotateZ={0} />
          <Corner positionTop={-1} positionRight={-1} transformRotateZ={270} />
          <Corner
            positionBottom={-1}
            positionRight={-1}
            transformRotateZ={180}
          />
          <Corner positionBottom={-1} positionLeft={-1} transformRotateZ={90} />

          <AnimatedIconProvider value={{ edgeColor: edgeColorSpring }}>
            <Container
              display='contents'
              {...{
                '*': {
                  transformScale,
                  transformRotateX: transformRotateWOffset,
                  transformRotateY: transformRotateWOffset,
                },
              }}
            >
              {children}
            </Container>
          </AnimatedIconProvider>
        </Container>
      </Container>

      <Container
        flexGrow={1}
        flexDirection='column'
        alignItems='flex-start'
        gap={4}
      >
        <Container positionType='relative'>
          <label.Out />

          <Container
            depthWrite
            positionType='absolute'
            positionTop={0}
            positionBottom={0}
            positionLeft={0}
            positionRight={hoverWidth}
            backgroundColor='black'
            overflow='hidden'
            zIndexOffset={2}
            {...{ '*': { color: 'white' } }}
          >
            <label.Out />
          </Container>
        </Container>

        <description.Out />
      </Container>
    </Container>
  );
};

export const CardLabel: FC<PropsWithChildren> = ({ children }) => {
  const { label } = useTunnels();

  return (
    <label.In>
      <Container
        display='contents'
        {...{
          '*': {
            paddingX: 4,
            fontSize: 20,
            fontWeight: 'semi-bold',
            letterSpacing: 0.4,
          },
        }}
      >
        {children}
      </Container>
    </label.In>
  );
};

export const CardDescription: FC<PropsWithChildren> = ({ children }) => {
  const { description } = useTunnels();

  return (
    <description.In>
      <Container
        display='contents'
        {...{
          '*': {
            paddingX: 4,
            fontSize: 14,
            color: colors.mutedForeground,
            lineHeight: 1.5,
          },
        }}
      >
        {children}
      </Container>
    </description.In>
  );
};

export const Card: FC<CardInternalProps> = ({ children, ...props }) => {
  const tunnels = useMemo(() => {
    return {
      label: tunnel(),
      description: tunnel(),
    };
  }, []);

  return (
    <TunnelsProvider value={tunnels}>
      <FontsProvider>
        <CardInternal {...props}>{children}</CardInternal>
      </FontsProvider>
    </TunnelsProvider>
  );
};
