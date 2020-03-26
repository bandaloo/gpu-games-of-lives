// transforms the colors in the simulation into better ones

#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;
uniform vec2 resolution;

uniform vec4 youngColor;
uniform vec4 oldColor;
uniform vec4 trailColor;
uniform vec4 deadColor;

void main() {
  vec4 originalColor = vec4(texture2D(uSampler, gl_FragCoord.xy / resolution).rgb, 1.0);
  vec4 newColor = mix(oldColor, youngColor, originalColor.b) * originalColor.r
                  + mix(deadColor, trailColor, originalColor.g) * (1.0 - originalColor.r);
  gl_FragColor = newColor;
}
