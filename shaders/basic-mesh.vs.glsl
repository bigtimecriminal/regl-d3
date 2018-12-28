precision mediump float;
attribute vec3 position;
varying vec2 vUv;
uniform mat4 projection, modelView;
void main() {
  gl_Position = projection * modelView * vec4(position, 1);
}
