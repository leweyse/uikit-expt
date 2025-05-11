uniform sampler2D uTexture;

varying vec2 vUv;
varying vec2 vUv1;

void main() {
  vec3 col = texture2D(uTexture, vUv).rgb;

  gl_FragColor = vec4(col, 1.0);
}
