uniform sampler2D uCurve;
uniform float uSamples;
uniform float uTotal;
uniform float uHead;
uniform float uRoll;
uniform float uWave;
uniform float uWaveLength;
uniform float uWavePhase;
uniform float uBodyLength;
uniform float uBodyScale;

const float TWO_PI = 6.28318530718;
const float CURVE_ROWS = 3.0;

const float ENV_BASE = 0.0284;
const float ENV_GAIN = 0.3672;
const float ENV_POWER = 5.25;

vec3 dfP, dfR, dfU, dfSkinned;
float dfLat;

vec3 curveRow(float u, float row) {
  float x = u * uSamples - 0.5;
  float i0 = floor(x);
  float f = x - i0;
  float t0 = (mod(i0, uSamples) + 0.5) / uSamples;
  float t1 = (mod(i0 + 1.0, uSamples) + 0.5) / uSamples;
  float v = (row + 0.5) / CURVE_ROWS;
  return mix(texture2D(uCurve, vec2(t0, v)).xyz,
             texture2D(uCurve, vec2(t1, v)).xyz, f);
}
