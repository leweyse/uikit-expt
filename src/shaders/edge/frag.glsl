uniform vec3 uEdgeColor;
uniform float uStrength;

varying vec2 vUv;

float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0)
        hue += 1.0;
    else if (hue > 1.0)
        hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0)
        res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0)
        res = f2;
    else if ((3.0 * hue) < 2.0)
        res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else
        res = f1;
    return res;
}

vec3 hsl2rgb(float h, float s, float l) {
    vec3 hsl = vec3(h, s, l);

    vec3 rgb;

    if (hsl.y == 0.0) {
        rgb = vec3(hsl.z); // Luminance
    } else {
        float f2;

        if (hsl.z < 0.5)
            f2 = hsl.z * (1.0 + hsl.y);
        else
            f2 = hsl.z + hsl.y - hsl.y * hsl.z;

        float f1 = 2.0 * hsl.z - f2;

        rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
        rgb.g = hue2rgb(f1, f2, hsl.x);
        rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
    }

    return rgb;
}

float edgeFactor(vec2 p, float strength) {
  vec2 grid = abs(fract(p - 0.5) - 0.5) / fwidth(p) / strength;
  return min(grid.x, grid.y);
}

void main() {
  float a = edgeFactor(vUv, uStrength);

  vec3 c = mix(vec3(uEdgeColor), vec3(1), a);

  gl_FragColor = vec4(c, 1.0);
}
