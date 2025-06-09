import { animated } from '@react-spring/three';
import { CameraControls } from '@react-three/drei';
import { Content, Root, Text } from '@react-three/uikit';
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
          <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={500} />
        </IfInSessionMode>

        <Cards />
      </Canvas.In>

      <Footer.In>
        <Reference href='https://x.com/thomasauros/status/1910715343045001648'>
          thomasauros
        </Reference>
      </Footer.In>
    </>
  ),
});

const AnimatedColumns = animated(Columns);

const InteractiveColumns = () => {
  const { edgeColor } = useCardIcon();

  // @ts-expect-error - not sure how to type this
  return <AnimatedColumns edgeColor={edgeColor} />;
};

const AnimatedCubes = animated(Cubes);

const InteractiveCubes = () => {
  const { edgeColor } = useCardIcon();

  // @ts-expect-error - not sure how to type this
  return <AnimatedCubes edgeColor={edgeColor} />;
};

function Cards() {
  return (
    <Root
      display='flex'
      flexDirection='column'
      gap={12}
      width={450}
      transformScale={0.45}
    >
      <Card>
        <CardLabel>
          <Text>UIKIT</Text>
        </CardLabel>

        <CardDescription>
          <Text>
            Build performant 3D user interfaces for threejs using R3F and yoga.
            Perfect for games, XR (VR/AR), and any web-based Spatial Computing
            App.
          </Text>
        </CardDescription>

        <Content transformScale={0.75}>
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

        <Content transformScale={1.1}>
          <InteractiveCubes />
        </Content>
      </Card>
    </Root>
  );
}
