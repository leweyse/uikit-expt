import type { ComponentRef } from 'react';

import type { CustomShaderRef } from '@/types';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { forwardObjectEvents } from '@pmndrs/pointer-events';
import { computed, signal } from '@preact/signals-core';
import { CameraControls } from '@react-three/drei';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { Handle, HandleTarget } from '@react-three/handle';
import { Container } from '@react-three/uikit';
import {
  Diamond,
  LoaderCircle,
  RotateCcw,
  SendHorizontal,
} from '@react-three/uikit-lucide';
import { IfInSessionMode } from '@react-three/xr';
import { useMutation } from '@tanstack/react-query';
import { createLazyFileRoute } from '@tanstack/react-router';
import * as THREE from 'three';

import { Button, buttonVariants } from '@/common/canvas/button';
import { Fullscreen } from '@/common/canvas/fullscreen';
import { colors } from '@/common/canvas/theme';
import { Github, Reference } from '@/common/dom/reference';
import { Canvas, Footer, Header } from '@/global/tunnels';
import { WrapMaterial } from '@/shaders/wrap';
import { useFBO, useFBOInXRFrame } from '@/utils/use-fbo';
import {
  useSpringColorSignal,
  useSpringSignal,
} from '@/utils/use-spring-signal';

import { Image } from './-components/image';
import { Input } from './-components/input';
import { Mesh } from './-components/mesh';
import {
  ImageShaderTunnel,
  ImageTunnel,
  InputShaderTunnel,
  ResetTunnel,
} from './-tunnels';

const SM_FACTOR = 1.5;
const MD_FACTOR = 2;
const LG_FACTOR = 2.75;

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
  const isMutating = useMemo(() => signal(false), []);

  const [loaderRotationZ, loaderRotationZSpring] = useSpringSignal(0);
  const [recRotationZ, recRotationZSpring] = useSpringSignal(0);
  const [recBackgroundColor, recBackgroundColorSpring] = useSpringColorSignal(
    buttonVariants.secondary.backgroundColor?.value,
  );
  const [recColor, recColorSpring] = useSpringSignal(
    buttonVariants.secondary.color?.value,
  );
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
      shaderRightSideProgress.start(signal.value);
    },
  });

  const mutation = useMutation({
    mutationKey: ['get-image-url'],
    mutationFn: async (prompt: string) => {
      console.info(`Fetching image for prompt: ${prompt}`);

      // You can use any API you want here
      await delay(2000);

      const promise = new Promise<{
        src: string;
        texture: THREE.Texture<HTMLImageElement>;
        aspectRatio: number;
      }>((resolve) => {
        new THREE.TextureLoader().load(
          '/DAUGHTER_STEREO-MIND-GAMES.jpeg',
          (texture) => {
            resolve({
              src: '/DAUGHTER_STEREO-MIND-GAMES.jpeg',
              texture,
              aspectRatio: texture.image.width / texture.image.height,
            });
          },
        );
      });

      return await promise;
    },
    onMutate: () => {
      isMutating.value = true;
      loaderRotationZSpring.start(-360, {
        loop: true,
        config: { duration: 1000 },
      });
    },
    onSuccess: () => {
      shaderLeftSideProgress.start(1);
    },
    onSettled: () => {
      isMutating.value = false;
      loaderRotationZSpring.start(0);
    },
  });

  const isDisabled = useMemo(() => {
    return computed(() => {
      return isMutating.value || !(inputSignal.value.length > 0);
    });
  }, []);

  const isRotating = useMemo(() => {
    return computed(() => {
      return isMutating.value ? loaderRotationZ.value : 0;
    });
  }, []);

  const inputPointerEvents = useMemo(() => {
    return computed(() => {
      if (shaderLeftSide.value > 0) return 'none';
      return 'auto';
    });
  }, []);

  const resetPointerEvents = useMemo(() => {
    return computed(() => {
      if (resetOpacity.value === 1) return 'auto';
      return 'none';
    });
  }, []);

  const reset = useCallback(() => {
    recRotationZSpring.start(0);

    if (imageElem.current) {
      imageElem.current.reset().then(() => {
        shaderLeftSideProgress.start(0);
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
          opacity={resetOpacity}
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
            lg={{
              borderRadius: 40 * LG_FACTOR,
              minHeight: 52 * LG_FACTOR,
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
        paddingY={6}
        paddingX={16}
        backgroundColor={colors.secondary}
        borderRadius={40}
        pointerEvents={inputPointerEvents}
        sm={{
          paddingX: 12 * SM_FACTOR,
          paddingY: 6 * SM_FACTOR,
          borderRadius: 40 * SM_FACTOR,
        }}
        md={{
          paddingX: 12 * MD_FACTOR,
          paddingY: 6 * MD_FACTOR,
          borderRadius: 40 * MD_FACTOR,
        }}
        lg={{
          paddingX: 12 * LG_FACTOR,
          paddingY: 6 * LG_FACTOR,
          borderRadius: 40 * LG_FACTOR,
        }}
      >
        <Button
          size='icon'
          variant='outline'
          flexShrink={0}
          backgroundColor={recBackgroundColor}
          borderColor={colors.secondaryForeground}
          borderRadius={99}
          {...{
            '*': {
              flexShrink: 0,
              color: recColor,
              transformRotateZ: recRotationZ,
            },
          }}
          hover={{
            backgroundColor: recBackgroundColor,
            '*': {
              color: recColor,
            },
          }}
          sm={{
            width: 36 * SM_FACTOR,
            height: 36 * SM_FACTOR,
          }}
          md={{
            width: 36 * MD_FACTOR,
            height: 36 * MD_FACTOR,
          }}
          lg={{
            width: 36 * LG_FACTOR,
            height: 36 * LG_FACTOR,
          }}
          onPointerDown={() => {
            recBackgroundColorSpring.start(
              buttonVariants.default.backgroundColor?.value,
            );
            recColorSpring.start(buttonVariants.default.color?.value);

            recRotationZSpring.start(-360, {
              loop: true,
              config: { duration: 1600 },
            });
          }}
          onPointerUp={() => {
            recBackgroundColorSpring.start(colors.secondary.value);
            recColorSpring.start(colors.secondaryForeground.value);

            recRotationZSpring.start(0, {
              loop: false,
              config: { duration: undefined },
            });
          }}
        >
          <Diamond
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
            lg={{
              width: 16 * LG_FACTOR,
              height: 16 * LG_FACTOR,
            }}
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
            minHeight={40}
            sm={{
              minHeight: 40 * SM_FACTOR,
            }}
            md={{
              minHeight: 40 * MD_FACTOR,
            }}
            lg={{
              minHeight: 40 * LG_FACTOR,
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
              paddingX={6}
              fontSize={18}
              {...{
                '*': {
                  sm: {
                    paddingX: 6 * SM_FACTOR,
                    fontSize: 18 * SM_FACTOR,
                  },
                  md: {
                    paddingX: 6 * MD_FACTOR,
                    fontSize: 18 * MD_FACTOR,
                  },
                  lg: {
                    paddingX: 6 * LG_FACTOR,
                    fontSize: 18 * LG_FACTOR,
                  },
                },
              }}
              sm={{
                paddingX: 6 * SM_FACTOR,
              }}
              md={{
                paddingX: 6 * MD_FACTOR,
              }}
              lg={{
                paddingX: 6 * LG_FACTOR,
              }}
            />
          </Container>
        </Container>

        <Button
          size='icon'
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
          lg={{
            width: 36 * LG_FACTOR,
            height: 36 * LG_FACTOR,
          }}
          {...{
            '*': {
              transformRotateZ: isRotating,
            },
          }}
          disabled={isDisabled}
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
              sm={{
                width: 16 * SM_FACTOR,
                height: 16 * SM_FACTOR,
              }}
              md={{
                width: 16 * MD_FACTOR,
                height: 16 * MD_FACTOR,
              }}
              lg={{
                width: 16 * LG_FACTOR,
                height: 16 * LG_FACTOR,
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
              lg={{
                width: 16 * LG_FACTOR,
                height: 16 * LG_FACTOR,
              }}
            />
          )}
        </Button>
      </Container>
    </>
  );
}
