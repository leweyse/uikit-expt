import type { CustomShaderRef } from '@/types';

import { useEffect, useMemo, useRef } from 'react';
import { computed, signal } from '@preact/signals-core';
import { OrbitControls } from '@react-three/drei';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { Container, Fullscreen } from '@react-three/uikit';
import { Diamond, MoveUp } from '@react-three/uikit-lucide';
import { PointerEvents } from '@react-three/xr';
import { createLazyFileRoute } from '@tanstack/react-router';
import * as THREE from 'three';

import { Button } from '@/common/canvas/button';
import { colors } from '@/common/canvas/theme';
import { themes } from '@/common/themes';
import { Canvas } from '@/global/tunnels';
import { ElemMaterial } from '@/shaders/elem';
import { useSpringSignal } from '@/utils/use-spring-signal';

import { Input } from './-components/input';
import { FACTOR } from './-components/utils';

export const Route = createLazyFileRoute('/input/')({
  component: () => (
    <Canvas.In>
      <Page />
    </Canvas.In>
  ),
});

function Page() {
  const size = useThree((state) => state.size);
  const viewport = useThree((state) => state.viewport);

  const _width = size.width * viewport.dpr;
  const _height = size.height * viewport.dpr;
  const ratio = _width > _height ? _width / _height : _height / _width;

  const camera = new THREE.PerspectiveCamera(75, _width / _height, 0.1, 1000);
  camera.position.set(0, 0, 5);

  const scene = new THREE.Scene();
  scene.background = themes.neutral.light.background;

  const renderTarget = useMemo(() => {
    return new THREE.WebGLRenderTarget(_width, _height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  }, [_width, _height]);

  useEffect(() => {
    return () => renderTarget.dispose();
  }, [renderTarget]);

  const shader = useRef<CustomShaderRef<typeof ElemMaterial>>(null);

  useFrame((state) => {
    const { gl, clock } = state;

    // Set the current render target to our FBO
    gl.setRenderTarget(renderTarget);

    // Render the simulation material with square geometry in the render target
    gl.render(scene, camera);

    if (shader.current) {
      shader.current.uniforms.uTime.value = clock.getElapsedTime();
    }

    // Revert to the default render target
    gl.setRenderTarget(null);
  });

  return (
    <>
      <OrbitControls />

      {createPortal(
        <Fullscreen distanceToCamera={1} alignItems='center'>
          {/* Sync with outer controls */}
          <OrbitControls camera={camera} />

          <PointerEvents forwardPointerCapture />

          <ChatInput />
        </Fullscreen>,
        scene,
      )}

      <mesh scale={7 / ratio} position={[0, 0, 0]}>
        <planeGeometry
          args={[
            _width > _height ? _width / _height : 1,
            _width > _height ? 1 : _height / _width,
            32,
            32,
          ]}
        />
        <elemMaterial
          key={ElemMaterial.key}
          ref={shader}
          uTexture={renderTarget.texture}
        />
      </mesh>
    </>
  );
}

function ChatInput() {
  const inputSignal = useMemo(() => signal(''), []);

  const isRecording = useMemo(() => signal(false), []);
  const [recRotationZ, recRotationZSpring] = useSpringSignal(0);

  const recButtonBg = computed(() => {
    if (isRecording.value) {
      return colors.primary.value;
    }

    return colors.secondary.value;
  });

  const recIconColor = computed(() => {
    if (isRecording.value) {
      return colors.primaryForeground.value;
    }

    return colors.secondaryForeground.value;
  });

  const sendButtonBg = computed(() => {
    if (inputSignal.value.length > 0) {
      return colors.primary.value;
    }

    return colors.secondary.value;
  });

  const sendIconColor = computed(() => {
    if (inputSignal.value.length > 0) {
      return colors.primaryForeground.value;
    }

    return colors.secondaryForeground.value;
  });

  return (
    <Container
      flexDirection='row'
      gap={8}
      alignItems='center'
      justifyContent='center'
      width='100%'
      paddingY={0}
      paddingX={8}
      backgroundColor={colors.secondary}
      borderRadius={32}
      sm={{
        gap: 8 * FACTOR,
        paddingX: 8 * FACTOR,
        borderRadius: 32 * FACTOR,
      }}
    >
      <Button
        flexShrink={0}
        width={28}
        aspectRatio={1}
        backgroundColor={recButtonBg}
        borderWidth={1}
        borderColor={colors.secondaryForeground}
        borderRadius={99}
        sm={{
          width: 28 * FACTOR,
          borderRadius: 99 * FACTOR,
        }}
        onPointerDown={() => {
          isRecording.value = true;
          recRotationZSpring.start(180, {
            loop: true,
            config: { duration: 800 },
          });
        }}
        onPointerUp={() => {
          isRecording.value = false;
          recRotationZSpring.start(0, {
            loop: false,
            config: { duration: undefined },
          });
        }}
      >
        <Diamond
          width={12}
          height={12}
          color={recIconColor}
          transformRotateZ={recRotationZ}
          sm={{
            width: 12 * FACTOR,
            height: 12 * FACTOR,
          }}
        />
      </Button>

      <Container width='100%' height='auto' overflow='scroll'>
        <Container
          width='100%'
          height='auto'
          minHeight={48}
          backgroundColor={colors.secondary}
          sm={{
            minHeight: 40 * FACTOR,
          }}
        >
          <Input
            multiline
            placeholder='Type your message here'
            value={inputSignal}
            onValueChange={(value) => {
              inputSignal.value = value;
            }}
            width='100%'
            height='100%'
            paddingY={10}
            backgroundColor={colors.secondary}
            borderWidth={0}
            lineHeight={20}
            fontSize={14}
            sm={{
              paddingY: 10 * FACTOR,
              fontSize: 12 * FACTOR,
              lineHeight: 16 * FACTOR,
            }}
          />
        </Container>
      </Container>

      <Button
        flexShrink={0}
        width={28}
        aspectRatio={1}
        backgroundColor={sendButtonBg}
        borderWidth={1}
        borderColor={colors.secondaryForeground}
        borderRadius={99}
        sm={{
          width: 28 * FACTOR,
          borderRadius: 99 * FACTOR,
        }}
        hover={{
          backgroundOpacity: 0.8,
        }}
        onClick={() => {
          inputSignal.value = '';
        }}
      >
        <MoveUp
          color={sendIconColor}
          width={12}
          height={12}
          sm={{
            width: 12 * FACTOR,
            height: 12 * FACTOR,
          }}
        />
      </Button>
    </Container>
  );
}
