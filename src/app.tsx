import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { animated } from '@react-spring/three';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Content, Root, Text } from '@react-three/uikit';

import {
  Card,
  CardDescription,
  CardLabel,
  useCardIcon,
} from '@/components/card';
import { Columns, Cubes } from '@/components/svg';

import './index.css';

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

function App() {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: 100 }}
      gl={{ localClippingEnabled: true }}
      style={{ height: '100dvh', touchAction: 'none' }}
    >
      <OrbitControls />

      <Root display='flex' flexDirection='column' width={450} gap={6}>
        <Card>
          <CardLabel>
            <Text>Relay</Text>
          </CardLabel>

          <CardDescription>
            <Text>
              A network proxy for encrypting and decrypting data in transit.
            </Text>
          </CardDescription>

          <Content transformScale={0.75}>
            <InteractiveColumns />
          </Content>
        </Card>

        <Card>
          <CardLabel>
            <Text>Enclaves</Text>
          </CardLabel>

          <CardDescription>
            <Text>
              Build, deploy and scale applications in a Confidential Computing
              environment.
            </Text>
          </CardDescription>

          <Content transformScale={1.1}>
            <InteractiveCubes />
          </Content>
        </Card>
      </Root>
    </Canvas>
  );
}

const root = document.getElementById('app');

createRoot(root!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
