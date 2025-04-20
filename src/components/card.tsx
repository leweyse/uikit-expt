import type { Color } from 'three';

import type { PropsWithChildren } from '@/types';

import { createContext, type FC, useContext, useMemo } from 'react';
import { animated, type SpringValue } from '@react-spring/three';
import { Container, Content, DefaultProperties } from '@react-three/uikit';
import tunnel from 'tunnel-rat';

import { colors } from '@/common/canvas/theme';
import { themes } from '@/common/themes';
import { Corner } from '@/components/corner';
import { useSpringSignal } from '@/utils/use-spring-signal';

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

const CardInternal: FC<PropsWithChildren> = ({ children }) => {
  const { label, description } = useTunnels();

  const [inset, insetSpring] = useSpringSignal(0);
  const [padding, paddingSpring] = useSpringSignal(12);
  const [transformRotate, transformRotateSpring] = useSpringSignal(0);
  const [hoverWidth, hoverWidthSpring] = useSpringSignal(
    '100%' as `${number}%`,
  );

  const [_, edgeColorSpring] = useSpringSignal(themes.neutral.light.primary);

  return (
    <Container
      flexDirection='row'
      alignItems='center'
      width='100%'
      padding={24}
      gap={20}
      onPointerOver={() => {
        edgeColorSpring.start(themes.violet.light.primary);

        insetSpring.start(-6);
        paddingSpring.start(4);
        hoverWidthSpring.start('0%');

        transformRotateSpring.start(360, {
          loop: true,
          config: { duration: 5000 },
        });
      }}
      onPointerLeave={() => {
        edgeColorSpring.start(themes.neutral.light.primary);

        insetSpring.start(0);
        paddingSpring.start(12);
        hoverWidthSpring.start('100%');

        transformRotateSpring.start(0, {
          loop: false,
          config: { duration: undefined },
        });
      }}
    >
      <Container
        positionType='relative'
        width={88}
        aspectRatio={1}
        borderWidth={1}
        borderColor={colors.border}
        borderOpacity={0.25}
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

          <Content
            depthAlign='middle'
            positionType='absolute'
            inset={0}
            padding={padding}
            transformRotateX={transformRotate}
            transformRotateY={transformRotate}
          >
            <AnimatedIconProvider value={{ edgeColor: edgeColorSpring }}>
              {children}
            </AnimatedIconProvider>
          </Content>
        </Container>
      </Container>

      <Container
        flexGrow={1}
        flexDirection='column'
        alignItems='flex-start'
        gap={6}
      >
        <Container positionType='relative'>
          <label.Out />

          <Container
            positionType='absolute'
            positionTop={0}
            positionBottom={0}
            positionLeft={0}
            positionRight={hoverWidth}
            backgroundColor='black'
            overflow='hidden'
            zIndexOffset={2}
          >
            <DefaultProperties color='white'>
              <label.Out />
            </DefaultProperties>
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
      <DefaultProperties
        paddingX={4}
        fontSize={20}
        fontWeight='semi-bold'
        letterSpacing={0.4}
        lineHeight={28}
      >
        {children}
      </DefaultProperties>
    </label.In>
  );
};

export const CardDescription: FC<PropsWithChildren> = ({ children }) => {
  const { description } = useTunnels();

  return (
    <description.In>
      <DefaultProperties
        paddingX={4}
        fontSize={16}
        lineHeight={24}
        color={colors.mutedForeground}
      >
        {children}
      </DefaultProperties>
    </description.In>
  );
};

export const Card: FC<PropsWithChildren> = ({ children }) => {
  const tunnels = useMemo(() => {
    return {
      label: tunnel(),
      description: tunnel(),
    };
  }, []);

  return (
    <TunnelsProvider value={tunnels}>
      <CardInternal>{children}</CardInternal>
    </TunnelsProvider>
  );
};
