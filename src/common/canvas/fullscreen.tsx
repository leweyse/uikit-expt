import type { ReactNode, RefAttributes } from 'react';
import type { Signal } from '@preact/signals-core';
import type { ComponentInternals, RootProperties } from '@react-three/uikit';

import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { batch, signal } from '@preact/signals-core';
import { createPortal, useFrame, useStore, useThree } from '@react-three/fiber';
import { Root } from '@react-three/uikit';
import {
  type Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  type Scene,
} from 'three';

export type Camera = OrthographicCamera | PerspectiveCamera;

export type BaseFullscreenProperties = Omit<
  RootProperties,
  'sizeX' | 'sizeY' | 'pixelSize' | 'anchorX' | 'anchorY'
>;

export type FullscreenProperties = BaseFullscreenProperties & {
  camera?: Camera;
  scene?: Scene;

  attachCamera?: boolean;
  distanceToCamera?: number;

  children?: ReactNode;
};

export type FullscreenRef = ComponentInternals<BaseFullscreenProperties>;

/**
 * must be called when camera.fov, camera.top, camera.bottom, camera.right, camera.left, camera.zoom, camera.aspect changes
 */
export function updateSizeFullscreen(
  sizeX: Signal<number>,
  sizeY: Signal<number>,
  pixelSize: Signal<number>,
  distanceToCamera: number,
  camera: Camera,
  screenHeight: number,
) {
  if (camera instanceof PerspectiveCamera) {
    const cameraHeight =
      2 * Math.tan((Math.PI * camera.fov) / 360) * distanceToCamera;
    pixelSize.value = cameraHeight / screenHeight;
    sizeY.value = cameraHeight;
    sizeX.value = cameraHeight * camera.aspect;
  }
  if (camera instanceof OrthographicCamera) {
    const cameraHeight = (camera.top - camera.bottom) / camera.zoom;
    const cameraWidth = (camera.right - camera.left) / camera.zoom;
    pixelSize.value = cameraHeight / screenHeight;
    sizeY.value = cameraHeight;
    sizeX.value = cameraWidth;
  }
}

export const Fullscreen: (
  props: FullscreenProperties & RefAttributes<FullscreenRef>,
) => ReactNode = forwardRef(({ camera, scene, ...properties }, ref) => {
  const store = useStore();

  const internalCamera = useThree((s) => s.camera);

  const __camera = camera ?? internalCamera;

  const distanceToCamera = properties.distanceToCamera ?? __camera.near + 0.1;

  // biome-ignore lint/correctness/useExhaustiveDependencies: not required
  const [sizeX, sizeY, pixelSize] = useMemo(() => {
    const sizeX = signal(1);
    const sizeY = signal(1);
    const pixelSize = signal(1);
    updateSizeFullscreen(
      sizeX,
      sizeY,
      pixelSize,
      distanceToCamera,
      __camera,
      store.getState().size.height,
    );
    return [sizeX, sizeY, pixelSize];
  }, []);

  const hasAttached = useRef(false);

  useFrame(
    ({ camera: internalCamera, scene: internalScene, size: { height } }) => {
      const __camera = camera ?? internalCamera;

      batch(() =>
        updateSizeFullscreen(
          sizeX,
          sizeY,
          pixelSize,
          distanceToCamera,
          __camera,
          height,
        ),
      );

      //attach camera to something so we can see the camera
      if (__camera.parent == null && (properties.attachCamera ?? true)) {
        const __scene = scene ?? internalScene;
        __scene.add(__camera);
        hasAttached.current = true;
      }
    },
  );

  //cleanup attaching the camera
  useEffect(
    () => () => {
      if (!hasAttached.current) {
        return;
      }
      const { camera: internalCamera, scene: internalScene } = store.getState();

      const __camera = camera ?? internalCamera;
      const __scene = scene ?? internalScene;

      // biome-ignore lint/suspicious/noDoubleEquals: check ref
      if (__camera.parent != __scene) {
        return;
      }

      __scene.remove(__camera);
    },
    [store, camera, scene],
  );

  return createPortal(
    <group position-z={-distanceToCamera}>
      <Root
        ref={ref}
        {...properties}
        sizeX={sizeX}
        sizeY={sizeY}
        pixelSize={pixelSize}
      >
        {properties.children}
      </Root>
    </group>,
    __camera as unknown as Object3D,
  );
});
