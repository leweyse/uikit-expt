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

vec3 rotateVector(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

float berzier(float a, float b, float c, float d, float t) {
  return (a * (1. - t) * (1. - t) * (1. - t))
  + (b * (1. - t) * (1. - t))
  + (c * (1. - t))
  + (d * t * t * t);
}

float mixedCurve(float x, float radius) {
  // Quarter circle arc: centered at (radius, 0), radius^2 = r²
  float y1 = sqrt(max(0., radius * radius - pow(x - radius, 2.)));

  // Sine-based smooth decay from radius to 0
  float decayLength = radius * 4.; // you can tweak this multiplier

  float t = clamp((x - radius) / decayLength, 0., 1.);

  float y2 = .5 * radius * (1. + sin(PI * (.5 - t)));

  // Select between y1 and y2 using step
  float inCircle = step(x, radius);     // 1 if x <= radius
  float inSine   = step(radius, x);     // 1 if x > radius

  return y1 * inCircle + y2 * inSine;
}

void main() {
  vUv = uv;

  float side = smoothstep(0., 1., uv.x);

  vec3 newPosition = position;

  // we could reuse this later
  // vec3 rotatedPosition = rotate(position, vec3(0., 1., 0.), PI);
  // newPosition = rotateVector(vec4(rotatedPosition, 0.), newPosition);
  // vec3 finalPosition = mix(position, newPosition, progress);

  // it could be mixed with the above
  // newPosition = rotateVector(vec4(newPosition, 0.), rotate(position, vec3(1., 0., 0.), PI));
  // vec3 finalPosition = mix(position, newPosition, progress);

  // vertical show (kinda)
  // vec3 rotatedPosition = rotate(newPosition, vec3(1., 0., 0.), PI);
  // newPosition = rotateVector(vec4(rotatedPosition, 0.), rotatedPosition);

  // float offs = newPosition.x + 0.5; // -0.5..0.5 -> 0..1

  // float rad = .2;

  // float firstHalfZ = rad * sin((-1. + offs) * PI * .5) + (1. - sin((1.25 * offs + .25) * PI)) * .0875;
  // float firstHalfX = rad * cos((1. + offs) * PI * .5) - newPosition.x;
  //
  // float secondHalfZ = -(rad * (sin((-1. + (1. - offs)) * PI * .5)) + (1. - sin((1.25 * (1.- offs) + .25) * PI)) * .0875);
  // float secondHalfX = rad * cos((1. + (1. - offs)) * PI * .5) + newPosition.x;
  //
  // // wrap
  // newPosition.z = firstHalfZ * (1. - side) + secondHalfZ * side;
  // newPosition.x = firstHalfX * (1. - side) + secondHalfX * side;
  //
  // // unwrap
  // newPosition = rotate(
  //   newPosition,
  //   vec3(
  //     sin(PI * 2.),
  //     cos(PI * 2.),
  //     0.
  //   ),
  //   -PI * (1. - progress) *  (1. - side)
  // );

  float leftProgress = 1. - uProgress;
  float rightProgress = 1. - uProgress2;

  float leftOffs = newPosition.x + 0.5;
  float leftAngle = 1. - smoothstep(0., .05, (leftOffs + .5) * leftProgress * .2);

  float rightOffs = 1. - (newPosition.x + 0.5);
  // Yeah, we use the leftProgress here. It keeps the curve with only one axis-rotation.
  float rightAngle = 1. - smoothstep(0., .05, (rightOffs -.5) * leftProgress * .2);

  newPosition = rotate(
    newPosition,
    vec3(0., 1., 0.),
    (leftAngle * (1. - side) + rightAngle * side) * PI
  );

  newPosition = rotate(
    newPosition,
    vec3(0., 1., 0.),
    (leftAngle * (1. - side) * leftProgress + rightAngle * side * rightProgress) * -PI
  );

  vec3 finalPosition = mix(newPosition, position, leftProgress);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1. );
}
