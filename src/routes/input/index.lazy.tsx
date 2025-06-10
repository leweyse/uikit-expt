import type { ComponentRef } from 'react';
import type * as THREE from 'three';

import type { CustomShaderRef } from '@/types';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { forwardObjectEvents } from '@pmndrs/pointer-events';
import { computed, signal } from '@preact/signals-core';
import { CameraControls } from '@react-three/drei';
import { createPortal, useFrame } from '@react-three/fiber';
import { Handle, HandleTarget } from '@react-three/handle';
import { Container, DefaultProperties, Root } from '@react-three/uikit';
import {
  Diamond,
  LoaderCircle,
  MoveUp,
  RotateCcw,
} from '@react-three/uikit-lucide';
import { IfInSessionMode } from '@react-three/xr';
import { useMutation } from '@tanstack/react-query';
import { createLazyFileRoute } from '@tanstack/react-router';

import { Button } from '@/common/canvas/button';
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

const MD_FACTOR = 3;
const SM_FACTOR = 2;

export const Route = createLazyFileRoute('/input/')({
  component: () => (
    <>
      <Header.In>
        <Github href='https://github.com/leweyse/uikit-expt/blob/main/src/routes/input/index.lazy.tsx' />
      </Header.In>

      <Canvas.In>
        <IfInSessionMode deny={['immersive-ar', 'immersive-vr']}>
          <CameraControls />
        </IfInSessionMode>

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
        <group position={[0, 0, 0.01]}>
          <ResetTunnel.Out />
        </group>
      </IfInSessionMode>

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
}) {
  const inputShaderMaterial =
    useRef<CustomShaderRef<typeof WrapMaterial>>(null);
  const imageShaderMaterial =
    useRef<CustomShaderRef<typeof WrapMaterial>>(null);
  const imageElem = useRef<ComponentRef<typeof Image>>(null);

  const inputSignal = useMemo(() => signal('Stereo Mind Game album cover'), []);
  const isRecording = useMemo(() => signal(false), []);

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

  const resetPointerEvents = computed(() => {
    if (resetOpacity.value === 1) return 'auto';
    return 'none';
  });

  const submit = () => {
    if (inputSignal.value.length > 0) {
      mutation.mutate(inputSignal.value);
    }
  };

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
        <Root
          width={8}
          height={8}
          justifyContent='center'
          alignItems='center'
          positionBottom={-32}
        >
          <Button
            variant='outline'
            flexShrink={0}
            padding={0}
            width='100%'
            height='100%'
            borderRadius={99}
            borderWidth={0.25}
            borderOpacity={resetOpacity}
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
              width={4}
              height={4}
              opacity={resetOpacity}
            />
          </Button>
        </Root>
      </ResetTunnel.In>

      <ImageTunnel.In>
        {mutation.data ? (
          <Image
            ref={imageElem}
            src={mutation.data.src}
            srcAspectRatio={mutation.data.aspectRatio}
            borderRadius={40}
            sm={{
              borderRadius: 40 * SM_FACTOR,
              minHeight: 40 * SM_FACTOR,
            }}
            md={{
              minHeight: 40 * MD_FACTOR,
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
          disabled={mutation.isPending}
          borderOpacity={undefined}
          backgroundOpacity={undefined}
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
          <DefaultProperties
            flexShrink={0}
            width={14}
            height={14}
            color={sendIconColor}
            opacity={1}
            sm={{ width: 12 * SM_FACTOR, height: 12 * SM_FACTOR }}
            md={{
              width: 12 * MD_FACTOR,
              height: 12 * MD_FACTOR,
            }}
          >
            {mutation.isPending ? (
              <LoaderCircle transformRotateZ={loaderRotationZ} />
            ) : (
              <MoveUp />
            )}
          </DefaultProperties>
        </Button>
      </Container>
    </>
  );
}
