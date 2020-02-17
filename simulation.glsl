#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;

// simulation texture state, swapped each frame
uniform sampler2D state;

// look up individual cell values
int get(int x, int y) {
  return int(
    texture2D(state, (gl_FragCoord.xy + vec2(x, y)) / resolution).r
  );
}

void main() {
  // get sum of all surrounding nine neighbors
  int sum = get(-1, - 1) + get(-1, 0) + get(-1, 1) + get(0, - 1) + get(0, 1) + get(1, - 1) + get(1, 0) + get(1, 1);
  
  if (sum == 3) {
    // ideal # of neighbors... if cell is living, stay alive, if it is dead, come to life!
    gl_FragColor = vec4(1.0);
  } else if (sum == 2) {
    // maintain current state
    float current = float(get(0, 0));
    gl_FragColor = vec4(vec3(current), 1.0);
  } else {
    // over-population or lonliness... cell dies
    gl_FragColor = vec4(vec3(0.0), 1.0);
  }
}