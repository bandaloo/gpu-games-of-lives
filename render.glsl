// transforms the colors in the simulation into better ones

#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;
uniform vec2 resolution;

vec4 youngColor = vec4(1.0, 1.0, 0.0, 1.0);
vec4 oldColor = vec4(0.0, 1.0, 1.0, 1.0);
vec4 trailColor = vec4(1.0, 0.0, 1.0, 1.0);
vec4 deadColor = vec4(1.0, 1.0, 1.0, 1.0);

void main() {
  vec4 originalColor = vec4(texture2D(uSampler, gl_FragCoord.xy / resolution).rgb, 1.0);
  vec4 newColor = mix(youngColor, oldColor, originalColor.b) * originalColor.r
                  + mix(deadColor, trailColor, originalColor.g) * (1.0 - originalColor.r);
  gl_FragColor = newColor;
}
