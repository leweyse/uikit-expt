import type { ComponentRef } from 'react';
import type * as THREE from 'three';

import type { CustomShaderRef } from '@/types';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { forwardObjectEvents } from '@pmndrs/pointer-events';
import { computed, signal } from '@preact/signals-core';
import { CameraControls, PerspectiveCamera } from '@react-three/drei';
import { createPortal, useFrame } from '@react-three/fiber';
import { Container, Root, useRootSize } from '@react-three/uikit';
import { Diamond, MoveUp, RotateCcw } from '@react-three/uikit-lucide';
import { createLazyFileRoute } from '@tanstack/react-router';

import { Button } from '@/common/canvas/button';
import { Fullscreen } from '@/common/canvas/fullscreen';
import { colors } from '@/common/canvas/theme';
import { Github, Reference } from '@/common/dom/reference';
import { themes } from '@/common/themes';
import { Canvas, Footer, Header } from '@/global/tunnels';
import { WrapMaterial } from '@/shaders/wrap';
import { useFBO } from '@/utils/use-fbo';
import { useSpringSignal } from '@/utils/use-spring-signal';

import { Image } from './-components/image';
import { Input } from './-components/input';
import { Mesh } from './-components/mesh';
import {
  ImageShaderTunnel,
  ImageTunnel,
  InputShaderTunnel,
  ResetTunnel,
} from './-tunnels';

const MD_FACTOR = 3;
const SM_FACTOR = 2;

export const Route = createLazyFileRoute('/input/')({
  component: () => (
    <>
      <Header.In>
        <Github href='https://github.com/leweyse/uikit-expt/blob/main/src/routes/input/index.lazy.tsx' />
      </Header.In>

      <Canvas.In>
        <CameraControls />

        {/* Reset camera controls */}
        <PerspectiveCamera makeDefault position={[0, 0, 8]} />

        <Prompt />
      </Canvas.In>

      <Footer.In>
        <Reference href='https://x.com/AlexFisla/status/1922690522633642060'>
          AlexFisla
        </Reference>
      </Footer.In>
    </>
  ),
});

function Prompt() {
  const [inputMesh, setInputMesh] = useState<THREE.Object3D | null>(null);
  const [imageMesh, setImageMesh] = useState<THREE.Object3D | null>(null);

  const {
    target: inputBuffer,
    camera: inputCamera,
    scene: inputScene,
  } = useFBO();
  const {
    target: imageBuffer,
    camera: imageCamera,
    scene: imageScene,
  } = useFBO();

  const forwardInputEvt = useMemo(() => {
    if (!inputMesh) return null;
    return forwardObjectEvents(inputMesh, () => inputCamera, inputScene);
  }, [inputMesh, inputCamera, inputScene]);

  const forwardImageEvt = useMemo(() => {
    if (!imageMesh) return null;
    return forwardObjectEvents(imageMesh, () => imageCamera, imageScene);
  }, [imageMesh, imageCamera, imageScene]);

  useEffect(() => {
    inputScene.background = themes.neutral.light.background;
    imageScene.background = themes.neutral.light.background;
  }, [inputScene, imageScene]);

  useFrame((state) => {
    const { gl } = state;

    gl.setRenderTarget(inputBuffer);

    gl.clear();

    if (forwardInputEvt) {
      forwardInputEvt.update();
    }

    gl.render(inputScene, inputCamera);

    gl.setRenderTarget(imageBuffer);

    gl.clear();

    if (forwardImageEvt) {
      forwardImageEvt.update();
    }

    gl.render(imageScene, imageCamera);

    // Revert to the default render target
    gl.setRenderTarget(null);
  });

  return (
    <>
      <ResetTunnel.Out />

      {createPortal(
        <Fullscreen
          distanceToCamera={2}
          camera={inputCamera}
          scene={inputScene}
          display='flex'
          alignItems='center'
        >
          <ChatInput inputBuffer={inputBuffer} imageBuffer={imageBuffer} />
        </Fullscreen>,
        inputScene as unknown as THREE.Object3D,
      )}

      {/* position the mesh behind the reset button */}
      <Mesh ref={setInputMesh} position={[0, 0, -0.1]}>
        <InputShaderTunnel.Out />
      </Mesh>

      {createPortal(
        <Fullscreen
          camera={imageCamera}
          scene={imageScene}
          display='flex'
          justifyContent='center'
          alignItems='center'
          positionType='relative'
        >
          <ImageTunnel.Out />
        </Fullscreen>,
        imageScene as unknown as THREE.Object3D,
      )}

      {/* position the mesh behind the reset button */}
      <Mesh
        ref={setImageMesh}
        rotation={[0, Math.PI, 0]}
        position={[0, 0, -0.1]}
      >
        <ImageShaderTunnel.Out />
      </Mesh>
    </>
  );
}

function ChatInput(props: {
  inputBuffer: THREE.WebGLRenderTarget;
  imageBuffer: THREE.WebGLRenderTarget;
}) {
  const inputShaderMaterial =
    useRef<CustomShaderRef<typeof WrapMaterial>>(null);
  const imageShaderMaterial =
    useRef<CustomShaderRef<typeof WrapMaterial>>(null);
  const imageElem = useRef<ComponentRef<typeof Image>>(null);

  const rootSize = useRootSize();

  const inputSignal = useMemo(() => signal(''), []);
  const isRecording = useMemo(() => signal(false), []);

  const [recRotationZ, recRotationZSpring] = useSpringSignal(0);
  const [resetOpacity, resetOpacitySpring] = useSpringSignal(0);

  const [_, shaderRightSideProgress] = useSpringSignal(0, {
    config: {
      mass: 10,
      tension: 200,
      friction: 72,
      clamp: true,
    },
    onChange: (value) => {
      if (inputShaderMaterial.current) {
        inputShaderMaterial.current.uniforms.uProgress2.value = value;
      }

      if (imageShaderMaterial.current) {
        imageShaderMaterial.current.uniforms.uProgress2.value = value;
      }
    },
    onRest: (signal) => {
      inputSignal.value = '';

      if (signal.value > 0 && imageElem.current) {
        imageElem.current.adjustSize();
        resetOpacitySpring.start(signal.value);
      }
    },
  });

  const [shaderLeftSide, shaderLeftSideProgress] = useSpringSignal(0, {
    config: {
      mass: 10,
      tension: 200,
      friction: 72,
      clamp: true,
    },
    onChange: (value) => {
      if (inputShaderMaterial.current) {
        inputShaderMaterial.current.uniforms.uProgress.value = value;
      }

      if (imageShaderMaterial.current) {
        imageShaderMaterial.current.uniforms.uProgress.value = value;
      }
    },
    onRest: (signal) => {
      if (signal.value > 0) {
        shaderRightSideProgress.start(signal.value);
      }
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

  const inputPointerEvents = computed(() => {
    if (shaderLeftSide.value > 0) return 'none';
    return 'auto';
  });

  const resetBottom = computed(() => {
    if (!rootSize.value) return 0;
    return -(rootSize.value[1] / 4) + 64;
  });

  const resetPointerEvents = computed(() => {
    if (resetOpacity.value === 1) return 'auto';
    return 'none';
  });

  const submit = () => {
    if (inputSignal.value.length > 0) {
      shaderLeftSideProgress.start(1);
    }
  };

  const reset = useCallback(() => {
    inputSignal.value = '';

    recRotationZSpring.start(0);

    if (imageElem.current) {
      imageElem.current.reset().then(() => {
        shaderLeftSideProgress.start(0);
        shaderRightSideProgress.start(0);
      });
    }

    resetOpacitySpring.start(0);
  }, [
    inputSignal,
    recRotationZSpring,
    shaderLeftSideProgress,
    shaderRightSideProgress,
    resetOpacitySpring,
  ]);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  useFrame((state) => {
    const { clock } = state;

    if (inputShaderMaterial.current) {
      inputShaderMaterial.current.uniforms.uTime.value = clock.getElapsedTime();
    }

    if (imageShaderMaterial.current) {
      imageShaderMaterial.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <>
      <ResetTunnel.In>
        <Root
          width={32}
          height={32}
          justifyContent='center'
          alignItems='center'
          positionBottom={resetBottom}
        >
          <Button
            variant='ghost'
            flexShrink={0}
            padding={0}
            width={32}
            height={32}
            borderRadius={99}
            backgroundOpacity={resetOpacity}
            pointerEvents={resetPointerEvents}
            onClick={() => {
              if (resetPointerEvents.value === 'auto') {
                reset();
              }
            }}
          >
            <RotateCcw
              flexShrink={0}
              width={16}
              height={16}
              opacity={resetOpacity}
            />
          </Button>
        </Root>
      </ResetTunnel.In>

      <ImageTunnel.In>
        <Suspense fallback={null}>
          <Image
            ref={imageElem}
            src='DAUGHTER_STEREO-MIND-GAMES.jpeg'
            height='100%'
            minHeight={48}
            objectFit='cover'
            borderRadius={40}
            sm={{
              borderRadius: 40 * SM_FACTOR,
              minHeight: 40 * SM_FACTOR,
            }}
            md={{
              minHeight: 40 * MD_FACTOR,
            }}
          />
        </Suspense>
      </ImageTunnel.In>

      <InputShaderTunnel.In>
        <wrapMaterial
          key={WrapMaterial.key}
          ref={inputShaderMaterial}
          uTexture={props.inputBuffer.texture}
        />
      </InputShaderTunnel.In>

      <ImageShaderTunnel.In>
        <wrapMaterial
          key={WrapMaterial.key}
          ref={imageShaderMaterial}
          uTexture={props.imageBuffer.texture}
          uBackFace={1}
        />
      </ImageShaderTunnel.In>

      <Container
        flexDirection='row'
        alignItems='center'
        justifyContent='center'
        width='100%'
        paddingY={2}
        paddingX={12}
        backgroundColor={colors.secondary}
        borderRadius={32}
        pointerEvents={inputPointerEvents}
        sm={{
          gap: 4 * SM_FACTOR,
          paddingX: 10 * SM_FACTOR,
          borderRadius: 32 * SM_FACTOR,
        }}
        md={{
          gap: 6 * MD_FACTOR,
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
            recRotationZSpring.start(-180, {
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
          onClick={submit}
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
