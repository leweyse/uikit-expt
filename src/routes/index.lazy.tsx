import { useEffect, useMemo, useState } from 'react';
import { forwardObjectEvents } from '@pmndrs/pointer-events';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import {
  createPortal,
  type ThreeElements,
  useFrame,
  useThree,
} from '@react-three/fiber';
import { Container, Text } from '@react-three/uikit';
import { MoveRight } from '@react-three/uikit-lucide';
import { createLazyFileRoute } from '@tanstack/react-router';
import * as THREE from 'three';

import { Button } from '@/common/canvas/button';
import { Fullscreen } from '@/common/canvas/fullscreen';
import { Github } from '@/common/dom/reference';
import { themes } from '@/common/themes';
import { Canvas, Header } from '@/global/tunnels';
import { BaseMaterial } from '@/shaders/base';
import { useFBO } from '@/utils/use-fbo';

export const Route = createLazyFileRoute('/')({
  component: () => (
    <>
      <Header.In>
        <Github href='https://github.com/leweyse/uikit-expt' />
      </Header.In>

      <Canvas.In>
        <OrbitControls />

        {/* Reset orbit controls */}
        <PerspectiveCamera makeDefault position={[0, 0, 8]} />

        <Welcome />
      </Canvas.In>
    </>
  ),
});

const Mesh = ({ children, ...props }: ThreeElements['mesh']) => {
  const size = useThree((state) => state.size);

  const ratio =
    size.width > size.height
      ? size.width / size.height
      : size.height / size.width;

  return (
    <mesh {...props} scale={7 / ratio}>
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

  useEffect(() => {
    scene.background = themes.neutral.light.background;
  }, [scene]);

  useFrame((state) => {
    const { gl } = state;

    gl.setRenderTarget(target);

    gl.clear();

    if (forwardEvt) {
      forwardEvt.update();
    }

    gl.render(scene, camera);

    gl.setRenderTarget(null);
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
          <Container flexDirection='column' alignItems='center' gap={24}>
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
                  fontFamily='heming'
                  fontSize={16}
                  sm={{ fontSize: 24 }}
                  md={{ fontSize: 36 }}
                >
                  Start
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
