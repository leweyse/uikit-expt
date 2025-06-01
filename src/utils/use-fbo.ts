import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const useFBO = () => {
  const size = useThree((state) => state.size);
  const viewport = useThree((state) => state.viewport);

  const target = useRef(
    new THREE.WebGLRenderTarget(size.width, size.height, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    }),
  );

  const camera = useRef(
    new THREE.PerspectiveCamera(75, size.width / size.height, 0.1, 1000),
  );

  const scene = useRef(new THREE.Scene());

  useEffect(() => {
    camera.current.position.set(0, 0, 5);
    camera.current.aspect = size.width / size.height;
  }, [size]);

  useEffect(() => {
    const _width = size.width * viewport.dpr;
    const _height = size.height * viewport.dpr;

    target.current.setSize(_width, _height);
  }, [size, viewport]);

  useEffect(() => {
    return () => target.current.dispose();
  }, []);

  return {
    target: target.current,
    camera: camera.current,
    scene: scene.current,
  };
};
