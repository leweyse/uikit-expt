import type { RefObject } from 'react';
import type { Group } from 'three';

import { animated } from '@react-spring/three';
import { CameraControls } from '@react-three/drei';
import { Handle } from '@react-three/handle';
import { Container, Content, Text } from '@react-three/uikit';
import { IfInSessionMode } from '@react-three/xr';
import { createLazyFileRoute } from '@tanstack/react-router';

import { OrthographicCamera } from '@/common/canvas/custom-camera';
import { Github, Reference } from '@/common/dom/reference';
import { Canvas, Footer, Header } from '@/global/tunnels';

import {
  Card,
  CardDescription,
  CardLabel,
  useCardIcon,
} from './-components/card';
import { Columns, Cubes } from './-components/icons';

export const Route = createLazyFileRoute('/card/')({
  component: () => (
    <>
      <Header.In>
        <Github href='https://github.com/leweyse/uikit-expt/blob/main/src/routes/card/index.lazy.tsx' />
      </Header.In>

      <Canvas.In>
        <IfInSessionMode deny={['immersive-ar', 'immersive-vr']}>
          <CameraControls />
          <OrthographicCamera makeDefault position={[0, 0, 1]} zoom={250} />
        </IfInSessionMode>

        <IfInSessionMode allow={['immersive-vr', 'immersive-ar']}>
          <Handle
            targetRef='from-context'
            scale={false}
            multitouch={false}
            rotate={{ x: false }}
          >
            <Cards />
          </Handle>
        </IfInSessionMode>

        <IfInSessionMode deny={['immersive-ar', 'immersive-vr']}>
          <Cards />
        </IfInSessionMode>
      </Canvas.In>

      <Footer.In>
        <Reference href='https://x.com/thomasauros/status/1910715343045001648'>
          thomasauros
        </Reference>
      </Footer.In>
    </>
  ),
});

type IconProps = {
  ref?: RefObject<Group>;
};

const AnimatedColumns = animated(Columns);

const InteractiveColumns = ({ ref, ...props }: IconProps) => {
  const { edgeColor } = useCardIcon();

  // @ts-expect-error - not sure how to type this
  return <AnimatedColumns ref={ref} edgeColor={edgeColor} {...props} />;
};

const AnimatedCubes = animated(Cubes);

const InteractiveCubes = ({ ref, ...props }: IconProps) => {
  const { edgeColor } = useCardIcon();

  // @ts-expect-error - not sure how to type this
  return <AnimatedCubes ref={ref} edgeColor={edgeColor} {...props} />;
};

function Cards() {
  return (
    <Container
      display='flex'
      flexDirection='column'
      gap={12}
      width={450}
      transformScale={0.45}
    >
      <Card>
        <CardLabel>
          <Text>UIKit</Text>
        </CardLabel>

        <CardDescription>
          <Text>
            Build performant 3D user interfaces for threejs using R3F and yoga.
            Perfect for games, XR (VR/AR), and any web-based Spatial Computing
            App.
          </Text>
        </CardDescription>

        <Content transformScale={0.4}>
          <InteractiveColumns />
        </Content>
      </Card>

      <Card>
        <CardLabel>
          <Text>R3F</Text>
        </CardLabel>

        <CardDescription>
          <Text>
            Build your scene declaratively with re-usable, self-contained
            components that react to state, are readily interactive and can
            participate in React's ecosystem.
          </Text>
        </CardDescription>

        <Content transformScale={0.2}>
          <InteractiveCubes />
        </Content>
      </Card>
    </Container>
  );
}
