import { type ComponentProps, useEffect, useRef } from 'react';
import { OrthographicCamera as BaseOrthographicCamera } from '@react-three/drei';
import { useStore } from '@react-three/fiber';
import * as THREE from 'three';

// XR guards don't prevent issues with the camera state from R3F.
// Making the camera default (perspective or orthographic) does not implement
// a proper cleanup for the case where the user switches to a different camera
// from the "old one" (in this case, the default).
//
// So, this is a workaround to keep the "card" demo keep working, as well as
// allow update the router state (navigation) during an XR session.

let defaultCamera: THREE.PerspectiveCamera | undefined;

export const OrthographicCamera = ({
  makeDefault,
  ...props
}: ComponentProps<typeof BaseOrthographicCamera>) => {
  const store = useStore();

  const ref = useRef<THREE.OrthographicCamera>(null);

  useEffect(() => {
    const state = store.getState();

    if (makeDefault) {
      if (state.camera instanceof THREE.PerspectiveCamera) {
        defaultCamera = state.camera;
      }

      state.set(() => ({ camera: ref.current! }));

      return () => {
        if (state.gl.xr.enabled) {
          state.set(() => ({ camera: state.gl.xr.getCamera() }));
        } else {
          state.set(() => ({ camera: defaultCamera }));
        }
      };
    }
  }, [store, makeDefault]);

  return <BaseOrthographicCamera ref={ref} {...props} />;
};
