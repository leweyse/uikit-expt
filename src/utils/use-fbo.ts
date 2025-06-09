import { useEffect, useRef } from 'react';
import { setXRLayerRenderTarget } from '@pmndrs/xr';
import { useFrame, useStore, useThree } from '@react-three/fiber';
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

const v4Helper = new THREE.Vector4();
const viewportHelper = new THREE.Vector4();

//required hack to support pmndrs/postprocessing
function getSize(this: THREE.WebGLRenderer, target: THREE.Vector2) {
  this.getViewport(v4Helper);
  target.x = v4Helper.z - v4Helper.x;
  target.y = v4Helper.w - v4Helper.y;
  return target;
}

type Options = {
  target: THREE.WebGLRenderTarget;
  camera: THREE.Camera;
  scene: THREE.Scene;
  onBeforeRender?: () => void;
};

export const useFBOInXRFrame = (params: Options) => {
  const store = useStore();

  const { target, camera, scene, ...opts } = params;

  let oldAutoClear: THREE.WebGLRenderer['autoClear'];
  let oldXrEnabled: THREE.WebGLRenderer['xr']['enabled'];
  let oldIsPresenting: THREE.WebGLRenderer['xr']['isPresenting'];
  let oldRenderTarget: THREE.WebGLRenderTarget | null;
  let oldGetDrawingBufferSize: THREE.WebGLRenderer['getDrawingBufferSize'];
  let oldGetSize: THREE.WebGLRenderer['getSize'];

  useFrame((_, __, frame) => {
    const state = store.getState();
    const { gl } = state;

    oldAutoClear = gl.autoClear;
    oldXrEnabled = gl.xr.enabled;
    oldIsPresenting = gl.xr.isPresenting;
    oldRenderTarget = gl.getRenderTarget();
    oldGetSize = gl.getSize;
    oldGetDrawingBufferSize = gl.getDrawingBufferSize;
    gl.getViewport(viewportHelper);
    gl.autoClear = true;
    gl.xr.enabled = false;
    gl.xr.isPresenting = false;

    const renderTarget = target;
    gl.getSize = getSize;
    gl.getDrawingBufferSize = getSize;
    setXRLayerRenderTarget(gl, renderTarget, undefined, frame);

    if (opts?.onBeforeRender) {
      opts.onBeforeRender();
    }

    gl.render(scene, camera);
    gl.setRenderTarget(oldRenderTarget);
    gl.setViewport(viewportHelper);
    gl.autoClear = oldAutoClear;
    gl.xr.enabled = oldXrEnabled;
    gl.xr.isPresenting = oldIsPresenting;
    gl.getSize = oldGetSize;
    gl.getDrawingBufferSize = oldGetDrawingBufferSize;
  });
};
