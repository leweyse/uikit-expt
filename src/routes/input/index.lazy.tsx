import type { ComponentRef } from 'react';
import type * as THREE from 'three';

import type { CustomShaderRef } from '@/types';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { forwardObjectEvents } from '@pmndrs/pointer-events';
import { computed, signal } from '@preact/signals-core';
import { CameraControls } from '@react-three/drei';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { Handle, HandleTarget } from '@react-three/handle';
import { Container, withOpacity } from '@react-three/uikit';
import {
  Diamond,
  LoaderCircle,
  RotateCcw,
  SendHorizontal,
} from '@react-three/uikit-lucide';
import { IfInSessionMode } from '@react-three/xr';
import { useMutation } from '@tanstack/react-query';
import { createLazyFileRoute } from '@tanstack/react-router';

import { Button, buttonVariants } from '@/common/canvas/button';
import { Fullscreen } from '@/common/canvas/fullscreen';
import { colors } from '@/common/canvas/theme';
import { Github, Reference } from '@/common/dom/reference';
import { Canvas, Footer, Header } from '@/global/tunnels';
import { WrapMaterial } from '@/shaders/wrap';
import { useFBO, useFBOInXRFrame } from '@/utils/use-fbo';
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

const MD_FACTOR = 2;
const SM_FACTOR = 1.5;

export const Route = createLazyFileRoute('/input/')({
  component: () => (
    <>
      <Header.In>
        <Github href='https://github.com/leweyse/uikit-expt/blob/main/src/routes/input/index.lazy.tsx' />
      </Header.In>

      <Canvas.In>
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

  const cameraControlsRef = useRef<CameraControls>(null);

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

  useFBOInXRFrame({
    target: inputBuffer,
    camera: inputCamera,
    scene: inputScene,
    onBeforeRender: () => {
      if (forwardInputEvt) {
        forwardInputEvt.update();
      }
    },
  });

  useFBOInXRFrame({
    target: imageBuffer,
    camera: imageCamera,
    scene: imageScene,
    onBeforeRender: () => {
      if (forwardImageEvt) {
        forwardImageEvt.update();
      }
    },
  });

  return (
    <>
      <IfInSessionMode deny={['immersive-ar', 'immersive-vr']}>
        <CameraControls ref={cameraControlsRef} />

        <group position={[0, 0, 0.01]}>
          <ResetTunnel.Out />
        </group>
      </IfInSessionMode>

      {createPortal(
        <Fullscreen
          camera={inputCamera}
          scene={inputScene}
          display='flex'
          alignItems='center'
        >
          <ChatInput
            inputBuffer={inputBuffer}
            imageBuffer={imageBuffer}
            cameraControls={cameraControlsRef.current}
          />
        </Fullscreen>,
        inputScene as unknown as THREE.Object3D,
      )}

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

      <IfInSessionMode allow={['immersive-vr', 'immersive-ar']}>
        <HandleTarget>
          <Handle
            targetRef='from-context'
            scale={false}
            multitouch={false}
            rotate={{ x: false }}
          >
            <group position={[0, 0, 0.01]}>
              <ResetTunnel.Out />
            </group>
          </Handle>
        </HandleTarget>

        <Handle
          targetRef='from-context'
          scale={false}
          multitouch={false}
          rotate={{ x: false }}
        >
          <Mesh ref={setInputMesh}>
            <InputShaderTunnel.Out />
          </Mesh>
        </Handle>

        <Mesh ref={setImageMesh} rotation={[0, Math.PI, 0]}>
          <ImageShaderTunnel.Out />
        </Mesh>
      </IfInSessionMode>

      <IfInSessionMode deny={['immersive-ar', 'immersive-vr']}>
        <Mesh ref={setInputMesh}>
          <InputShaderTunnel.Out />
        </Mesh>

        <Mesh ref={setImageMesh} rotation={[0, Math.PI, 0]}>
          <ImageShaderTunnel.Out />
        </Mesh>
      </IfInSessionMode>
    </>
  );
}

const delay = (ms: number) => {
  return new Promise((res) => setTimeout(res, ms));
};

function ChatInput(props: {
  inputBuffer: THREE.WebGLRenderTarget;
  imageBuffer: THREE.WebGLRenderTarget;
  cameraControls: CameraControls | null;
}) {
  const { gl } = useThree();

  const inputShaderMaterial =
    useRef<CustomShaderRef<typeof WrapMaterial>>(null);
  const imageShaderMaterial =
    useRef<CustomShaderRef<typeof WrapMaterial>>(null);
  const imageElem = useRef<ComponentRef<typeof Image>>(null);

  const inputSignal = useMemo(() => signal('Stereo Mind Game album cover'), []);
  const isRecHovered = useMemo(() => signal(false), []);

  const [loaderRotationZ, loaderRotationZSpring] = useSpringSignal(0);
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

  const mutation = useMutation({
    mutationKey: ['get-image-url'],
    mutationFn: async (prompt: string) => {
      console.info(`Fetching image for prompt: ${prompt}`);

      // You can use any API you want here
      await delay(2000);

      return {
        src: '/DAUGHTER_STEREO-MIND-GAMES.jpeg',
        aspectRatio: 1,
      };
    },
    onMutate: () => {
      loaderRotationZSpring.start(-360, {
        loop: true,
        config: { duration: 1000 },
      });
    },
    onSuccess: () => {
      shaderLeftSideProgress.start(1);
    },
    onSettled: () => {
      loaderRotationZSpring.start(0);
    },
  });

  const recButtonVariant = computed(() => {
    if (isRecHovered.value) return 'default';
    return 'outline';
  });

  const recIconColor = computed(() => {
    return buttonVariants[recButtonVariant.value]?.hover?.color?.value;
  });

  const sendButtonDisabled = computed(() => {
    return !(inputSignal.value.length > 0);
  });

  const inputPointerEvents = computed(() => {
    if (shaderLeftSide.value > 0) return 'none';
    return 'auto';
  });

  const resetPointerEvents = computed(() => {
    if (resetOpacity.value === 1) return 'auto';
    return 'none';
  });

  const reset = useCallback(() => {
    recRotationZSpring.start(0);

    if (imageElem.current) {
      imageElem.current.reset().then(() => {
        shaderLeftSideProgress.start(0);
        shaderRightSideProgress.start(0);
      });
    }

    resetOpacitySpring.start(0);
  }, [
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
        <Button
          size='icon'
          variant='outline'
          width={8}
          height={8}
          padding={2}
          flexShrink={0}
          borderRadius={99}
          borderWidth={0.25}
          positionBottom={-64}
          borderColor={withOpacity(colors.input, resetOpacity)}
          backgroundColor={withOpacity(colors.background, resetOpacity)}
          hover={{
            backgroundColor: colors.accent,
            color: colors.accentForeground,
          }}
          pointerEvents={resetPointerEvents}
          onClick={() => {
            if (resetPointerEvents.value === 'auto') {
              reset();
            }
          }}
        >
          <RotateCcw opacity={resetOpacity} color={colors.accentForeground} />
        </Button>
      </ResetTunnel.In>

      <ImageTunnel.In>
        {mutation.data ? (
          <Image
            ref={imageElem}
            src={mutation.data.src}
            srcAspectRatio={mutation.data.aspectRatio}
            borderRadius={40}
            minHeight={52}
            sm={{
              borderRadius: 40 * SM_FACTOR,
              minHeight: 52 * SM_FACTOR,
            }}
            md={{
              borderRadius: 40 * MD_FACTOR,
              minHeight: 52 * MD_FACTOR,
            }}
          />
        ) : null}
      </ImageTunnel.In>

      <InputShaderTunnel.In>
        <wrapMaterial
          key={WrapMaterial.key}
          ref={inputShaderMaterial}
          uTexture={props.inputBuffer.texture}
          transparent={true}
          premultipliedAlpha={true}
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
        paddingX={12}
        backgroundColor={colors.secondary}
        borderRadius={40}
        pointerEvents={inputPointerEvents}
        sm={{
          paddingX: 12 * SM_FACTOR,
          borderRadius: 40 * SM_FACTOR,
        }}
        md={{
          paddingX: 12 * MD_FACTOR,
          borderRadius: 40 * MD_FACTOR,
        }}
      >
        <Button
          size='icon'
          variant={recButtonVariant}
          width={36}
          height={36}
          flexShrink={0}
          backgroundColor={colors.secondary}
          borderColor={colors.secondaryForeground}
          borderRadius={99}
          sm={{
            width: 36 * SM_FACTOR,
            height: 36 * SM_FACTOR,
          }}
          md={{
            width: 36 * MD_FACTOR,
            height: 36 * MD_FACTOR,
          }}
          onHoverChange={(isHover) => {
            isRecHovered.value = isHover;
          }}
          onPointerDown={() => {
            recRotationZSpring.start(-180, {
              loop: true,
              config: { duration: 800 },
            });
          }}
          onPointerUp={() => {
            recRotationZSpring.start(0, {
              loop: false,
              config: { duration: undefined },
            });
          }}
        >
          <Diamond
            flexShrink={0}
            width={16}
            height={16}
            color={recIconColor}
            sm={{
              width: 16 * SM_FACTOR,
              height: 16 * SM_FACTOR,
            }}
            md={{
              width: 16 * MD_FACTOR,
              height: 16 * MD_FACTOR,
            }}
            transformRotateZ={recRotationZ}
          />
        </Button>

        <Container
          width='100%'
          overflow='scroll'
          scrollbarColor={colors.border}
          // Camera-controls interrupts scrolling and text selection
          onPointerEnter={() => {
            props.cameraControls?.disconnect();
          }}
          onPointerLeave={() => {
            props.cameraControls?.connect(gl.domElement);
          }}
        >
          <Container
            width='100%'
            backgroundColor='transparent'
            minHeight={56}
            sm={{
              minHeight: 56 * SM_FACTOR,
            }}
            md={{
              minHeight: 56 * MD_FACTOR,
            }}
          >
            <Input
              placeholder='Type your message here'
              value={inputSignal}
              onValueChange={(value) => {
                inputSignal.value = value;
              }}
              backgroundColor='transparent'
              borderWidth={0}
              paddingX={8}
              fontSize={18}
              {...{
                '*': {
                  sm: {
                    paddingX: 8 * SM_FACTOR,
                    fontSize: 18 * SM_FACTOR,
                  },
                  md: {
                    paddingX: 8 * MD_FACTOR,
                    fontSize: 18 * MD_FACTOR,
                  },
                },
              }}
              sm={{
                paddingX: 8 * SM_FACTOR,
              }}
              md={{
                paddingX: 8 * MD_FACTOR,
              }}
            />
          </Container>
        </Container>

        <Button
          size='icon'
          width={36}
          height={36}
          flexShrink={0}
          borderRadius={99}
          sm={{
            width: 36 * SM_FACTOR,
            height: 36 * SM_FACTOR,
          }}
          md={{
            width: 36 * MD_FACTOR,
            height: 36 * MD_FACTOR,
          }}
          disabled={sendButtonDisabled || mutation.isPending}
          onClick={() => {
            if (inputSignal.value.length > 0) {
              mutation.mutate(inputSignal.value);
            }
          }}
        >
          {mutation.isPending ? (
            <LoaderCircle
              width={16}
              height={16}
              transformRotateZ={loaderRotationZ}
              sm={{
                width: 16 * SM_FACTOR,
                height: 16 * SM_FACTOR,
              }}
              md={{
                width: 16 * MD_FACTOR,
                height: 16 * MD_FACTOR,
              }}
            />
          ) : (
            <SendHorizontal
              width={16}
              height={16}
              sm={{
                width: 16 * SM_FACTOR,
                height: 16 * SM_FACTOR,
              }}
              md={{
                width: 16 * MD_FACTOR,
                height: 16 * MD_FACTOR,
              }}
            />
          )}
        </Button>
      </Container>
    </>
  );
}
