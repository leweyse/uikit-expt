import * as THREE from 'three';

export function hsl(h: number, s: number, l: number) {
  return new THREE.Color().setHSL(h / 360, s / 100, l / 100, 'srgb');
}
