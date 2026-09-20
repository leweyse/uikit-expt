uniform float uTime;
uniform float uProgress;
uniform float uProgress2;
uniform float uBackFace;

varying vec2 vUv;

float PI = 3.1415926535897932384626433832795;

float quadraticInOut(float t) {
  float p = 2.0 * t * t;
  return t < 0.5 ? p : -p + (4.0 * t) - 1.0;
}

mat4 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
              oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
              oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
              0.0,                                0.0,                                0.0,                                1.0);
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
  mat4 m = rotationMatrix(axis, angle);
  return (m * vec4(v, 1.0)).xyz;
}

void main() {
  vUv = uv;

  vec3 newPosition = position;

  float face = (uBackFace - 0.5) * 2.;

  float leftProgress = uProgress * 0.5;
  float rightProgress = uProgress2 * 0.5;

  float smoothProgress = clamp((leftProgress + rightProgress - (1. * uBackFace - uv.x * face) * 0.5) / 0.5, 0., 1.);

  newPosition = rotate(newPosition, vec3(0., 1., 0.), quadraticInOut(smoothProgress) * PI);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1. );
}
