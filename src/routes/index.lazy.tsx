import type { ThreeElements } from '@react-three/fiber';

import { useMemo, useState } from 'react';
import { forwardObjectEvents } from '@pmndrs/pointer-events';
import { CameraControls } from '@react-three/drei';
import { createPortal, useThree } from '@react-three/fiber';
import { Handle } from '@react-three/handle';
import { Container, Text } from '@react-three/uikit';
import { MoveRight } from '@react-three/uikit-lucide';
import { IfInSessionMode } from '@react-three/xr';
import { createLazyFileRoute } from '@tanstack/react-router';
import * as THREE from 'three';

import { Button } from '@/common/canvas/button';
import { Fullscreen } from '@/common/canvas/fullscreen';
import { Github } from '@/common/dom/reference';
import { themes } from '@/common/themes';
import { Canvas, Header } from '@/global/tunnels';
import { BaseMaterial } from '@/shaders/base';
import { useFBO, useFBOInXRFrame } from '@/utils/use-fbo';

export const Route = createLazyFileRoute('/')({
  component: () => (
    <>
      <Header.In>
        <Github href='https://github.com/leweyse/uikit-expt' />
      </Header.In>

      <Canvas.In>
        <IfInSessionMode deny={['immersive-vr', 'immersive-ar']}>
          <CameraControls />
        </IfInSessionMode>

        <IfInSessionMode allow={['immersive-vr', 'immersive-ar']}>
          <Handle
            targetRef='from-context'
            scale={false}
            multitouch={false}
            rotate={{ x: false }}
          >
            <Welcome />
          </Handle>
        </IfInSessionMode>

        <IfInSessionMode deny={['immersive-ar', 'immersive-vr']}>
          <Welcome />
        </IfInSessionMode>
      </Canvas.In>
    </>
  ),
});

const Mesh = ({ children, ...props }: ThreeElements['mesh']) => {
  const size = useThree((state) => state.size);

  return (
    <mesh {...props}>
      <planeGeometry
        args={[
          size.width > size.height ? size.width / size.height : 1,
          size.width > size.height ? 1 : size.height / size.width,
          1,
          1,
        ]}
      />

      {children}
    </mesh>
  );
};

function Welcome() {
  const navigate = Route.useNavigate();

  const [mesh, setMesh] = useState<THREE.Object3D | null>(null);

  const { target, camera, scene } = useFBO();

  const forwardEvt = useMemo(() => {
    if (!mesh) return null;
    return forwardObjectEvents(mesh, () => camera, scene);
  }, [mesh, camera, scene]);

  useFBOInXRFrame({
    target,
    camera,
    scene,
    onBeforeRender: () => {
      if (forwardEvt) {
        forwardEvt.update();
      }
    },
  });

  return (
    <>
      {createPortal(
        <Fullscreen
          camera={camera}
          scene={scene}
          display='flex'
          alignItems='center'
          justifyContent='center'
        >
          <Container
            flexDirection='column'
            alignItems='center'
            gap={16}
            padding={72}
            borderRadius={20}
            backgroundColor={themes.neutral.light.background}
          >
            <Text
              fontSize={60}
              fontWeight='light'
              fontFamily='heming'
              sm={{ fontSize: 120 }}
              md={{ fontSize: 200 }}
            >
              Welcome
            </Text>

            <Container gap={16}>
              <Button
                variant='secondary'
                borderRadius={99}
                gap={10}
                paddingX={20}
                height={32}
                sm={{
                  gap: 16,
                  height: 48,
                  paddingX: 32,
                }}
                md={{
                  gap: 20,
                  height: 72,
                  paddingX: 40,
                }}
                onClick={() => navigate({ to: '/card' })}
              >
                <Text
                  fontFamily='satoshi'
                  fontSize={16}
                  sm={{ fontSize: 24 }}
                  md={{ fontSize: 36 }}
                >
                  visit
                </Text>
                <MoveRight
                  flexShrink={0}
                  width={16}
                  height={16}
                  sm={{ width: 28, height: 28 }}
                  md={{ width: 36, height: 36 }}
                />
              </Button>
            </Container>
          </Container>
        </Fullscreen>,
        scene as unknown as THREE.Object3D,
      )}

      <Mesh ref={setMesh}>
        <baseMaterial
          key={BaseMaterial.key}
          uTexture={target.texture}
          side={THREE.DoubleSide}
        />
      </Mesh>
    </>
  );
}
