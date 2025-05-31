import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const useFBO = () => {
  const size = useThree((state) => state.size);
  const viewport = useThree((state) => state.viewport);

  const _width = size.width * viewport.dpr;
  const _height = size.height * viewport.dpr;

  const target = useMemo(() => {
    return new THREE.WebGLRenderTarget(_width, _height, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  }, [_width, _height]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: not required
  const camera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(
      75,
      size.width / size.height,
      0.1,
      1000,
    );
    cam.position.set(0, 0, 5);
    return cam;
  }, []);

  const scene = useMemo(() => new THREE.Scene(), []);

  useEffect(() => {
    camera.aspect = size.width / size.height;
  }, [camera, size]);

  useEffect(() => {
    target.setSize(_width, _height);
  }, [target, _width, _height]);

  useEffect(() => {
    return () => target.dispose();
  }, [target]);

  return {
    target,
    camera,
    scene,
  };
};
