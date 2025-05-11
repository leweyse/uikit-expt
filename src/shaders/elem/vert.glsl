uniform float uTime;

varying vec2 vUv;

void main() {
  vUv = uv;

  vec4 modelPosition = vec4(position, 1.0);
  modelPosition.z += sin(modelPosition.x * 4.0 + uTime * 2.0) * 0.2;

  gl_Position = projectionMatrix * modelViewMatrix * modelPosition;
}
