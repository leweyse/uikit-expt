uniform float uTime;
uniform float uProgress;
uniform float uProgress2;

varying vec2 vUv;

float PI = 3.1415926535897932384626433832795;

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

  float side = smoothstep(0., 1., uv.x);

  vec3 newPosition = position;

  float fProgress = 1. - uProgress;
  float sProgress = 1. - uProgress2;

  float fOffs = newPosition.x + 0.5;
  float fAngle = 1. - smoothstep(0., .05, (fOffs + .5) * fProgress * .2);

  float sOffs = 1. - (newPosition.x + 0.5);
  // Yeah, we use the fProgress here. It keeps the curve with only one axis-rotation.
  float sAngle = 1. - smoothstep(0., .05, (sOffs -.5) * fProgress * .2);

  newPosition = rotate(
    newPosition,
    vec3(0., 1., 0.),
    (fAngle * (1. - side) + sAngle * side) * PI
  );

  newPosition = rotate(
    newPosition,
    vec3(0., 1., 0.),
    (fAngle * fProgress * (1. - side) + sAngle * sProgress * side) * -PI
  );

  vec3 finalPosition = mix(newPosition, position, fProgress);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1. );
}
