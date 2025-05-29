import type { CustomShaderRef } from '@/types';

import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { forwardObjectEvents } from '@pmndrs/pointer-events';
import { computed, signal } from '@preact/signals-core';
import { OrbitControls } from '@react-three/drei';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { Container, Fullscreen } from '@react-three/uikit';
import { Diamond, MoveUp } from '@react-three/uikit-lucide';
import { createLazyFileRoute } from '@tanstack/react-router';
import * as THREE from 'three';

import { Button } from '@/common/canvas/button';
import { colors } from '@/common/canvas/theme';
import { themes } from '@/common/themes';
import { Canvas } from '@/global/tunnels';
import { ElemMaterial } from '@/shaders/elem';
import { useSpringSignal } from '@/utils/use-spring-signal';

import { Input } from './-components/input';
import { ShaderTunnel } from './-components/shader';

const MD_FACTOR = 3;
const SM_FACTOR = 2;

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

  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);

  const outerControls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const innerControls = useRef<ComponentRef<typeof OrbitControls>>(null);

  const renderTarget = useMemo(() => {
    return new THREE.WebGLRenderTarget(_width, _height, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  }, [_width, _height]);

  const camera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(75, _width / _height, 0.1, 1000);
    cam.position.set(0, 0, 5);
    return cam;
  }, [_width, _height]);

  const scene = useMemo(() => {
    const scene = new THREE.Scene();
    scene.background = themes.neutral.light.background;
    return scene;
  }, []);

  const forwardObjEvt = useMemo(() => {
    if (!mesh) return null;
    return forwardObjectEvents(mesh, () => camera, scene);
  }, [mesh, camera, scene]);

  useEffect(() => {
    renderTarget.setSize(_width, _height);
  }, [renderTarget, _width, _height]);

  useEffect(() => {
    return () => {
      outerControls.current?.reset();
      innerControls.current?.reset();
      renderTarget.dispose();
    };
  }, [renderTarget]);

  useFrame((state) => {
    const { gl } = state;

    // Set the current render target to our FBO
    gl.setRenderTarget(renderTarget);

    gl.clear();

    if (forwardObjEvt) {
      forwardObjEvt.update();
    }

    // Render the simulation material with square geometry in the render target
    gl.render(scene, camera);

    // Revert to the default render target
    gl.setRenderTarget(null);
  });

  return (
    <>
      <OrbitControls ref={outerControls} />

      {createPortal(
        <Fullscreen distanceToCamera={1} alignItems='center'>
          {/* Sync with outer controls */}
          <OrbitControls ref={innerControls} camera={camera} />
          <ChatInput renderTarget={renderTarget} />
        </Fullscreen>,
        scene,
      )}

      <mesh ref={setMesh} scale={7 / ratio}>
        <planeGeometry
          args={[
            _width > _height ? _width / _height : 1,
            _width > _height ? 1 : _height / _width,
            96,
            96,
          ]}
        />

        <ShaderTunnel.Out />
      </mesh>
    </>
  );
}

function ChatInput(props: { renderTarget: THREE.WebGLRenderTarget }) {
  const shader = useRef<CustomShaderRef<typeof ElemMaterial>>(null);

  const inputSignal = useMemo(() => signal(''), []);
  const isRecording = useMemo(() => signal(false), []);

  const [recRotationZ, recRotationZSpring] = useSpringSignal(0);

  const [_, shaderRightSideProgress] = useSpringSignal(0, {
    config: {
      friction: 48,
    },
    onChange: (value) => {
      if (shader.current) {
        shader.current.uniforms.uProgress2.value = value;
      }
    },
    onRest: () => {
      inputSignal.value = '';
    },
  });

  const [__, shaderLeftSideProgress] = useSpringSignal(0, {
    config: {
      clamp: true,
      duration: 750,
    },
    onChange: (value) => {
      if (shader.current) {
        shader.current.uniforms.uProgress.value = value;
      }
    },
    onRest: () => {
      shaderRightSideProgress.start(1);
    },
  });

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

  useFrame((state) => {
    const { clock } = state;

    if (shader.current) {
      shader.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <>
      <ShaderTunnel.In>
        <elemMaterial
          key={ElemMaterial.key}
          ref={shader}
          uTexture={props.renderTarget.texture}
          side={THREE.DoubleSide} // debug
        />
      </ShaderTunnel.In>

      <Container
        flexDirection='row'
        gap={4}
        alignItems='center'
        justifyContent='center'
        width='100%'
        paddingY={0}
        paddingX={10}
        backgroundColor={colors.secondary}
        borderRadius={32}
        sm={{
          gap: 4 * SM_FACTOR,
          paddingX: 10 * SM_FACTOR,
          borderRadius: 32 * SM_FACTOR,
        }}
        md={{
          gap: 4 * MD_FACTOR,
          paddingX: 10 * MD_FACTOR,
          borderRadius: 32 * MD_FACTOR,
        }}
      >
        <Button
          flexShrink={0}
          width={36}
          aspectRatio={1}
          backgroundColor={recButtonBg}
          borderWidth={1}
          borderColor={colors.secondaryForeground}
          borderRadius={99}
          sm={{
            width: 28 * SM_FACTOR,
            borderRadius: 99 * SM_FACTOR,
          }}
          md={{
            width: 28 * MD_FACTOR,
            borderRadius: 99 * MD_FACTOR,
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
            flexShrink={0}
            width={14}
            height={14}
            color={recIconColor}
            transformRotateZ={recRotationZ}
            sm={{
              width: 12 * SM_FACTOR,
              height: 12 * SM_FACTOR,
            }}
            md={{
              width: 12 * MD_FACTOR,
              height: 12 * MD_FACTOR,
            }}
          />
        </Button>

        <Container width='100%' overflow='scroll'>
          <Container
            width='100%'
            minHeight={48}
            backgroundColor={colors.secondary}
            sm={{
              minHeight: 40 * SM_FACTOR,
            }}
            md={{
              minHeight: 40 * MD_FACTOR,
            }}
          >
            <Input
              multiline
              placeholder='Type your message here'
              value={inputSignal}
              onValueChange={(value) => {
                inputSignal.value = value;
              }}
              paddingY={10}
              backgroundColor={colors.secondary}
              borderWidth={0}
              lineHeight={20}
              fontSize={16}
              sm={{
                paddingY: 10 * SM_FACTOR,
                fontSize: 12 * SM_FACTOR,
                lineHeight: 16 * SM_FACTOR,
              }}
              md={{
                paddingY: 10 * MD_FACTOR,
                fontSize: 12 * MD_FACTOR,
                lineHeight: 16 * MD_FACTOR,
              }}
            />
          </Container>
        </Container>

        <Button
          flexShrink={0}
          width={36}
          aspectRatio={1}
          backgroundColor={sendButtonBg}
          borderWidth={1}
          borderColor={colors.secondaryForeground}
          borderRadius={99}
          sm={{ width: 28 * SM_FACTOR, borderRadius: 99 * SM_FACTOR }}
          md={{
            width: 28 * MD_FACTOR,
            borderRadius: 99 * MD_FACTOR,
          }}
          hover={{
            backgroundOpacity: 0.8,
          }}
          onClick={() => {
            if (inputSignal.value.length > 0) {
              shaderLeftSideProgress.start(1);
            }
          }}
        >
          <MoveUp
            flexShrink={0}
            width={14}
            height={14}
            color={sendIconColor}
            sm={{ width: 12 * SM_FACTOR, height: 12 * SM_FACTOR }}
            md={{
              width: 12 * MD_FACTOR,
              height: 12 * MD_FACTOR,
            }}
          />
        </Button>
      </Container>
    </>
  );
}
