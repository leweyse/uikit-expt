import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { animated } from '@react-spring/three';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Root, Text } from '@react-three/uikit';

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
      className='absolute inset-0 touch-none'
      gl={{ localClippingEnabled: true }}
    >
      <OrthographicCamera makeDefault zoom={100} position={[0, 0, 10]} />

      <OrbitControls />

      <Root display='flex' flexDirection='column' width={500} gap={6}>
        <Card iconScale={0.75}>
          <CardLabel>
            <Text>Relay</Text>
          </CardLabel>

          <CardDescription>
            <Text>
              A network proxy for encrypting and decrypting data in transit.
            </Text>
          </CardDescription>

          <InteractiveColumns  />
        </Card>

        <Card iconScale={1.1}>
          <CardLabel>
            <Text>Enclaves</Text>
          </CardLabel>

          <CardDescription>
            <Text>
              Build, deploy and scale applications in a Confidential Computing
              environment.
            </Text>
          </CardDescription>

          <InteractiveCubes />
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
