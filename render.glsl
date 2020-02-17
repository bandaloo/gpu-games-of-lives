// simplest possible fragment shader

#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;
uniform vec2 resolution;

void main() {
  gl_FragColor = vec4(texture2D(uSampler, gl_FragCoord.xy / resolution).rgb, 1.0);
}