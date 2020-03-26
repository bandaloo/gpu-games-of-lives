#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;

// simulation texture state, swapped each frame
uniform sampler2D state;

// defines the rules of the board
uniform int rules[9];

// to seed the psuedorandom number generator
uniform float seed;

// whether to step the simulation
uniform int paused;

// chance for initial starting condition
uniform float prob;

// uniforms for color drop rate
uniform float aliveMix;
uniform float deadMix;

// constants for rules
const int die = 0;
const int stay = 1;
const int birth = 2;
const int both = 3;

// random function from book of shaders
float random(vec2 st) {
  return fract(sin(dot(st.xy / 123.45, vec2(12.9898, 78.233))) * 43758.5453123 * (9.0 + seed));
}

// returns 1.0 or 0.0 based on chance
float randomChance(vec2 st, float chance) {
  return step(chance, random(st));
}

// get a pixel value
vec4 getPixel(int x, int y) {
  return texture2D(state, (mod(gl_FragCoord.xy + vec2(x, y), resolution)) / resolution);
}

// look up individual cell values
int get(int x, int y) {
  return int(getPixel(x, y).r);
}

// get stepped color of alive cell
vec4 getAliveColor(vec4 color) {
  return vec4(1.0, 0.0, (1.0 - color.r) * 1.0 + aliveMix * color.b, 1.0);
}

// get stepped color of dead cell
vec4 getDeadColor(vec4 color) {
  return vec4( 0.0, color.r * 1.0 + color.g * deadMix, 0.0, 1.0 );
}

void main() {
  // randomize on the GPU at the beginning
  if (time == 0.0) {
    gl_FragColor = vec4(vec3(randomChance(gl_FragCoord.xy, prob)), 1.0);
    return;
  }

  // get sum of all surrounding nine neighbors
  int sum = get(-1, -1) + get(-1, 0) + get(-1, 1) + get(0, -1) + get(0, 1) + get(1, -1) + get(1, 0) + get(1, 1);

  // index rules array based on neighbor #
  int result;

  // can't index by a non-constant, so we have to loop through
  for (int i = 0; i < 9; i++) {
    if (i == sum) {
      result = rules[i];
      break;
    }
  }

  vec4 color = getPixel(0, 0);

  if (paused == 1) {
    gl_FragColor = color;
    return;
  }

  // TODO don't call get here (used color)
  float current = float(get(0, 0));

  if (result == stay) {
    // maintain current state
    gl_FragColor = vec4(color.r, color.g * deadMix, color.r * (aliveMix * color.b), 1.0);
  } else if (result == both) {
    // ideal # of neighbors... if cell is living, stay alive, if it is dead, come to life!
    gl_FragColor = getAliveColor(color);
  } else if (result == birth) {
    // semi-ideal # of neighbors... if cell is living, die, but if dead, come to life
    if (current == 0.0) {
      gl_FragColor = getAliveColor(color);
    } else {
      gl_FragColor = getDeadColor(color);
    }
  } else if (result == die) {
    // over-population or loneliness... cell dies
    gl_FragColor = getDeadColor(color);
  }
}
