// WebGL2 renderer: animated gradient background, instanced particles rendered into a
// half-float framebuffer, a bloom chain, and a composite pass with film grain.
import { W, H } from "./util.js";

export const STRIDE = 9; // x, y, size, rot, r, g, b, a, shape

const VS_FULL = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.0-1.0,0.0,1.0); }`;

const FS_BG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uBase; uniform float uGrid;
uniform vec4 uBlobs[6]; uniform vec3 uCols[6];
out vec4 o;
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv = px / uRes.y; // aspect-correct units (height = 1)
  vec3 col = uBase;
  for(int i=0;i<6;i++){
    vec2 c = uBlobs[i].xy * vec2(uRes.x/uRes.y, 1.0);
    float d = length(uv - c) / max(uBlobs[i].z, 1e-3);
    float w = exp(-d*d*1.6) * uBlobs[i].w;
    col = mix(col, uCols[i], clamp(w, 0.0, 1.0));
  }
  // playful dot grid
  vec2 g = mod(px, 44.0) - 22.0;
  float dotm = smoothstep(2.6, 1.6, length(g)) * uGrid;
  col = mix(col, vec3(0.08,0.13,0.23), dotm*0.07);
  o = vec4(col, 1.0);
}`;

const VS_PART = `#version 300 es
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aPosSizeRot;
layout(location=2) in vec4 aColor;
layout(location=3) in float aShape;
uniform vec2 uRes;
out vec2 vUv; out vec4 vCol; flat out float vShape;
void main(){
  float s = aPosSizeRot.z; float r = aPosSizeRot.w;
  vec2 k = aCorner;
  if(aShape > 0.5 && aShape < 1.5) k.y *= 0.5; // confetti strips
  vec2 off = mat2(cos(r), sin(r), -sin(r), cos(r)) * (k * s);
  vec2 p = aPosSizeRot.xy + off;
  gl_Position = vec4(p.x/uRes.x*2.0-1.0, 1.0-p.y/uRes.y*2.0, 0.0, 1.0);
  vUv = aCorner; vCol = aColor; vShape = aShape;
}`;

const FS_PART = `#version 300 es
precision highp float;
in vec2 vUv; in vec4 vCol; flat in float vShape; out vec4 o;
void main(){
  float a;
  if(vShape < 0.5){ // soft disc with a light core
    float d = length(vUv);
    a = smoothstep(1.0, 0.72, d);
    vec3 c = vCol.rgb + (1.0 - smoothstep(0.0, 0.55, d)) * 0.25;
    o = vec4(c * a * vCol.a, a * vCol.a); return;
  } else if(vShape < 1.5){ // rounded confetti strip
    vec2 q = abs(vUv) - vec2(0.75, 0.75);
    float d = length(max(q, 0.0)) - 0.2;
    a = smoothstep(0.08, -0.08, d);
  } else { // ring
    float d = abs(length(vUv) - 0.72);
    a = smoothstep(0.24, 0.1, d);
  }
  o = vec4(vCol.rgb * a * vCol.a, a * vCol.a);
}`;

const FS_BLUR = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uDir; uniform vec2 uRes; out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float w[5] = float[](0.227, 0.194, 0.121, 0.054, 0.016);
  vec4 c = texture(uTex, uv) * w[0];
  for(int i=1;i<5;i++){ vec2 d = uDir * float(i) / uRes; c += (texture(uTex, uv+d) + texture(uTex, uv-d)) * w[i]; }
  o = c;
}`;

const FS_COPY = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes; out vec4 o;
void main(){ o = texture(uTex, gl_FragCoord.xy / uRes); }`;

const FS_COMP = `#version 300 es
precision highp float;
uniform sampler2D uBg, uPart, uGlowT; uniform vec2 uRes; uniform float uGlow, uTime, uFlash;
out vec4 o;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 bg = texture(uBg, uv).rgb;
  vec4 p = texture(uPart, uv);
  vec3 g = texture(uGlowT, uv).rgb * uGlow;
  vec3 col = 1.0 - (1.0 - bg) * (1.0 - clamp(g, 0.0, 1.0)); // screen-blend glow onto the bright page
  col = p.rgb + col * (1.0 - p.a);
  col = mix(col, vec3(1.0), uFlash);
  col += (hash(gl_FragCoord.xy + uTime*61.0) - 0.5) * 0.035; // grain also kills gradient banding
  o = vec4(col, 1.0);
}`;

function compile(gl, vs, fs) {
  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = new Proxy({}, { get: (c, k) => (k in c ? c[k] : (c[k] = gl.getUniformLocation(p, k))) });
  return { p, u };
}

export function createRenderer(canvas, maxParticles) {
  canvas.width = W;
  canvas.height = H;
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: true });
  if (!gl) throw new Error("WebGL2 unavailable");
  const floatOk = !!gl.getExtension("EXT_color_buffer_float");

  const target = (w, h) => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (floatOk) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  };
  const bgT = target(W, H);
  const partT = target(W, H);
  const bw = W / 4, bh = H / 4;
  const bloomA = target(bw, bh);
  const bloomB = target(bw, bh);

  const bgP = compile(gl, VS_FULL, FS_BG);
  const partP = compile(gl, VS_PART, FS_PART);
  const blurP = compile(gl, VS_FULL, FS_BLUR);
  const copyP = compile(gl, VS_FULL, FS_COPY);
  const compP = compile(gl, VS_FULL, FS_COMP);

  // instanced particle geometry
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const inst = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, inst);
  gl.bufferData(gl.ARRAY_BUFFER, maxParticles * STRIDE * 4, gl.DYNAMIC_DRAW);
  const B = STRIDE * 4;
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, B, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, B, 16);
  gl.vertexAttribDivisor(2, 1);
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 1, gl.FLOAT, false, B, 32);
  gl.vertexAttribDivisor(3, 1);
  gl.bindVertexArray(null);
  const empty = gl.createVertexArray();

  const pass = (prog, t, w, h) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog.p);
    gl.uniform2f(prog.u.uRes, w, h);
  };
  const tex = (prog, name, unit, t) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.uniform1i(prog.u[name], unit);
  };
  const tri = () => {
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  function render({ time, base, blobs, grid, data, count, glow, flash }) {
    gl.disable(gl.BLEND);
    // 1. background
    pass(bgP, bgT, W, H);
    gl.uniform1f(bgP.u.uTime, time);
    gl.uniform3fv(bgP.u.uBase, base);
    gl.uniform1f(bgP.u.uGrid, grid);
    const bl = new Float32Array(24), bc = new Float32Array(18);
    blobs.slice(0, 6).forEach((b, i) => {
      bl.set([b.x, b.y, b.r, b.s], i * 4);
      bc.set(b.c, i * 3);
    });
    gl.uniform4fv(bgP.u.uBlobs, bl);
    gl.uniform3fv(bgP.u.uCols, bc);
    tri();

    // 2. particles into the half-float target (premultiplied alpha)
    pass(partP, partT, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (count > 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindBuffer(gl.ARRAY_BUFFER, inst);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * STRIDE);
      gl.bindVertexArray(vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      gl.disable(gl.BLEND);
    }

    // 3. bloom: downsample, then two separable blur rounds
    pass(copyP, bloomA, bw, bh);
    tex(copyP, "uTex", 0, partT);
    tri();
    for (let k = 0; k < 2; k++) {
      pass(blurP, bloomB, bw, bh);
      tex(blurP, "uTex", 0, bloomA);
      gl.uniform2f(blurP.u.uDir, 1.6 + k, 0);
      tri();
      pass(blurP, bloomA, bw, bh);
      tex(blurP, "uTex", 0, bloomB);
      gl.uniform2f(blurP.u.uDir, 0, 1.6 + k);
      tri();
    }

    // 4. composite to the canvas
    pass(compP, null, W, H);
    tex(compP, "uBg", 0, bgT);
    tex(compP, "uPart", 1, partT);
    tex(compP, "uGlowT", 2, bloomA);
    gl.uniform1f(compP.u.uGlow, glow);
    gl.uniform1f(compP.u.uTime, time);
    gl.uniform1f(compP.u.uFlash, flash || 0);
    tri();
  }

  return { gl, render, floatOk };
}
