uniform float uTime;

varying vec2 vUv;

float PI = 3.1415926535897932384626433832795;

vec4 RotateAroundYInDegrees (vec4 vertex, float degrees) {
  float alpha = degrees * PI / 180.0;
  float sina = sin(alpha);
  float cosa = cos(alpha);

  mat2 m = mat2(cosa, -sina, sina, cosa);

  return vec4((m * vertex.xz), vertex.yw).xzyw;
}

void main() {
  vUv = uv;

  float progress = cos(uTime * 2.0);

  float angle = progress * 180.0 * (1.0 - uv.x);

  vec4 modelPosition = vec4(position, 1.0);
  // modelPosition += RotateAroundYInDegrees(modelPosition, angle);

  gl_Position = projectionMatrix * modelViewMatrix * modelPosition;
}
