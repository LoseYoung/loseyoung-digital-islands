"use client";

import { useEffect, useRef } from "react";
import { FixedStepClock } from "./play/continuity-model";

const vertexSource = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() { v_uv = a_position * .5 + .5; gl_Position = vec4(a_position, 0., 1.); }
`;
const simulationSource = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_state;
uniform vec2 u_texel;
uniform vec2 u_resolution;
uniform vec2 u_splat;
uniform float u_strength;
uniform float u_radius;
// RGBA8 中 128 对应精确的静止高度，避免旧的 .5 编码产生量化偏置。
float heightAt(vec2 uv) { return (texture(u_state, uv).r * 255. - 128.) / 127.; }
void main() {
  float current = heightAt(v_uv);
  float previous = (texture(u_state, v_uv).g * 255. - 128.) / 127.;
  float left = heightAt(v_uv - vec2(u_texel.x, 0.));
  float right = heightAt(v_uv + vec2(u_texel.x, 0.));
  float down = heightAt(v_uv - vec2(0., u_texel.y));
  float up = heightAt(v_uv + vec2(0., u_texel.y));
  float nextHeight = ((left + right + down + up) * .5 - previous) * .982;
  if (u_strength > 0.) {
    vec2 delta = v_uv - u_splat; delta.x *= u_resolution.x / max(u_resolution.y, 1.);
    nextHeight += exp(-dot(delta, delta) / max(u_radius * u_radius, .000001)) * u_strength;
  }
  nextHeight = clamp(nextHeight, -.86, .86);
  outColor = vec4((nextHeight * 127. + 128.) / 255., (current * 127. + 128.) / 255., 0., 1.);
}
`;
const displaySource = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_state;
uniform vec2 u_texel;
uniform float u_time;
float heightAt(vec2 uv) { return (texture(u_state, uv).r * 255. - 128.) / 127.; }
void main() {
  float center = heightAt(v_uv);
  vec2 gradient = vec2(heightAt(v_uv + vec2(u_texel.x, 0.)) - heightAt(v_uv - vec2(u_texel.x, 0.)), heightAt(v_uv + vec2(0., u_texel.y)) - heightAt(v_uv - vec2(0., u_texel.y)));
  float gradientStrength = length(gradient);
  vec3 normal = normalize(vec3(-gradient * 7.2, 1.));
  float specular = pow(max(dot(normal, normalize(vec3(-.30, .50, .81))), 0.), 22.);
  float fresnel = pow(1. - clamp(normal.z, 0., 1.), 2.2);
  float ridge = smoothstep(.0055, .054, gradientStrength) * (1. - smoothstep(.145, .275, gradientStrength));
  float innerRefraction = smoothstep(.026, .13, abs(center)) * .025;
  float alpha = clamp(ridge * .17 + specular * ridge * .10 + fresnel * .04 + innerRefraction, 0., .19);
  float drift = .5 + .5 * sin(u_time * .10 + v_uv.x * 3. - v_uv.y * 1.9);
  vec3 colour = mix(vec3(.72, .82, .91), vec3(.28, .48, .67), .26 + drift * .07);
  colour = mix(colour, vec3(.24, .62, .64), clamp(gradientStrength * 2., 0., .13));
  colour = mix(colour, vec3(.43, .40, .56), .022);
  outColor = vec4(colour * (.70 + specular * .50 + fresnel * .16), alpha);
}
`;
type Impulse = { x: number; y: number; strength: number; radius: number };
type Sample = { x: number; y: number; time: number };
type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer };
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
function program(gl: WebGL2RenderingContext, source: string) {
  const shaders: WebGLShader[] = [];
  for (const [type, text] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, source]] as const) {
    const shader = gl.createShader(type); if (!shader) { shaders.forEach(s => gl.deleteShader(s)); return null; }
    shaders.push(shader); gl.shaderSource(shader, text); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { console.warn("水波着色器编译失败：", gl.getShaderInfoLog(shader)); shaders.forEach(s => gl.deleteShader(s)); return null; }
  }
  const result = gl.createProgram();
  if (!result) { shaders.forEach(s => gl.deleteShader(s)); return null; }
  shaders.forEach(shader => gl.attachShader(result, shader)); gl.linkProgram(result); shaders.forEach(shader => gl.deleteShader(shader));
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) { console.warn("水波着色器链接失败：", gl.getProgramInfoLog(result)); gl.deleteProgram(result); return null; }
  return result;
}
export default function FluidCursor() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas || matchMedia("(pointer: coarse)").matches) return;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) return;
    const simulation = program(gl, simulationSource), display = program(gl, displaySource), buffer = gl.createBuffer();
    if (!simulation || !display || !buffer) { if (simulation) gl.deleteProgram(simulation); if (display) gl.deleteProgram(display); if (buffer) gl.deleteBuffer(buffer); return; }
    const abort = new AbortController(), { signal } = abort, media = matchMedia("(prefers-reduced-motion: reduce)");
    const clock = new FixedStepClock();
    let front: Target | null = null, back: Target | null = null, sw = 1, sh = 1, frame = 0, activeUntil = 0, lost = false;
    let neutral = new Uint8Array(), latest: Sample | null = null, last: Sample | null = null, queued: Impulse | null = null;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0);
    const sim = { state: gl.getUniformLocation(simulation, "u_state"), texel: gl.getUniformLocation(simulation, "u_texel"), resolution: gl.getUniformLocation(simulation, "u_resolution"), splat: gl.getUniformLocation(simulation, "u_splat"), strength: gl.getUniformLocation(simulation, "u_strength"), radius: gl.getUniformLocation(simulation, "u_radius") };
    const view = { state: gl.getUniformLocation(display, "u_state"), texel: gl.getUniformLocation(display, "u_texel"), time: gl.getUniformLocation(display, "u_time") };
    const aSim = gl.getAttribLocation(simulation, "a_position"), aView = gl.getAttribLocation(display, "a_position");
    const allowed = () => { const choice = document.documentElement.dataset.motion; return !lost && !document.hidden && (choice === "on" || (choice !== "off" && !media.matches)); };
    const clear = () => { if (lost) return; gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.clear(gl.COLOR_BUFFER_BIT); };
    const destroy = () => { [front, back].forEach(t => { if (t) { gl.deleteTexture(t.texture); gl.deleteFramebuffer(t.framebuffer); } }); front = back = null; };
    const reset = () => { if (lost) return; [front, back].forEach(t => { if (t) { gl.bindTexture(gl.TEXTURE_2D, t.texture); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, neutral); } }); };
    const target = (): Target | null => {
      const texture = gl.createTexture(), framebuffer = gl.createFramebuffer();
      if (!texture || !framebuffer) { if (texture) gl.deleteTexture(texture); if (framebuffer) gl.deleteFramebuffer(framebuffer); return null; }
      gl.bindTexture(gl.TEXTURE_2D, texture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sw, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, neutral);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { gl.deleteTexture(texture); gl.deleteFramebuffer(framebuffer); return null; }
      return { texture, framebuffer };
    };
    const halt = () => { cancelAnimationFrame(frame); frame = 0; latest = last = null; queued = null; activeUntil = 0; clock.reset(); clear(); reset(); };
    const resize = () => {
      if (lost) return;
      halt(); const longest = Math.max(innerWidth, innerHeight, 1), scale = Math.min(1, 1920 / longest);
      canvas.width = Math.max(1, Math.round(innerWidth * scale)); canvas.height = Math.max(1, Math.round(innerHeight * scale));
      const simulationLongest = Math.min(460, Math.max(300, Math.round(longest * .28))), aspect = Math.max(.35, innerWidth / Math.max(innerHeight, 1));
      destroy(); sw = aspect >= 1 ? simulationLongest : Math.max(190, Math.round(simulationLongest * aspect)); sh = aspect >= 1 ? Math.max(190, Math.round(simulationLongest / aspect)) : simulationLongest;
      neutral = new Uint8Array(sw * sh * 4); for (let i = 0; i < neutral.length; i += 4) { neutral[i] = neutral[i+1] = 128; neutral[i+3] = 255; }
      front = target(); back = target(); clear();
    };
    const bind = (p: WebGLProgram, position: number) => { gl.useProgram(p); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0); };
    const step = (impulse: Impulse | null) => {
      if (!front || !back) return;
      bind(simulation, aSim); gl.bindFramebuffer(gl.FRAMEBUFFER, back.framebuffer); gl.viewport(0, 0, sw, sh); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, front.texture);
      gl.uniform1i(sim.state, 0); gl.uniform2f(sim.texel, 1 / sw, 1 / sh); gl.uniform2f(sim.resolution, sw, sh); gl.uniform2f(sim.splat, impulse?.x ?? .5, impulse?.y ?? .5);
      gl.uniform1f(sim.strength, impulse?.strength ?? 0); gl.uniform1f(sim.radius, impulse?.radius ?? .022); gl.drawArrays(gl.TRIANGLES, 0, 6); [front, back] = [back, front];
    };
    const paint = (now: number) => {
      if (!front) return; bind(display, aView); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, front.texture); gl.uniform1i(view.state, 0); gl.uniform2f(view.texel, 1 / sw, 1 / sh); gl.uniform1f(view.time, now / 1000); gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const sampleImpulse = (p: Sample): Impulse | null => {
      let speed = 0;
      if (last) { const distance = Math.hypot(p.x-last.x, p.y-last.y), elapsed = Math.max(1, p.time-last.time); if (distance < 26 && elapsed < 50) return null; speed = distance / elapsed * 1000; }
      last = p; return { x: clamp(p.x / Math.max(innerWidth,1)), y: clamp(1-p.y / Math.max(innerHeight,1)), strength: clamp(.13+speed/11000,.13,.23), radius: clamp(.016+speed/150000,.016,.026) };
    };
    const render = (now: number) => {
      frame = 0; if (!allowed() || !front || !back) { halt(); return; }
      const steps = clock.consume(now);
      // 在有模拟步时才消费输入；高刷屏的中间显示帧不丢掉指针扰动。
      if (steps) {
        if (latest) { const impulse = sampleImpulse(latest); latest = null; if (impulse && (!queued || impulse.strength > queued.strength)) queued = impulse; }
        for (let i = 0; i < steps; i++) step(i === 0 ? queued : null);
        queued = null; paint(now);
      }
      if (now < activeUntil || latest || queued) frame = requestAnimationFrame(render); else halt();
    };
    const wake = (ms = 3400) => { activeUntil = performance.now()+ms; if (!frame) { clock.reset(performance.now()); frame = requestAnimationFrame(render); } };
    const usable = (e: PointerEvent) => allowed() && e.pointerType !== "touch" && !(e.target instanceof Element && e.target.closest("[data-play-surface], .throw-star"));
    window.addEventListener("pointermove", e => { if (usable(e)) { latest = { x:e.clientX, y:e.clientY, time:e.timeStamp }; wake(); } }, { passive:true, signal });
    window.addEventListener("pointerdown", e => { if (!usable(e)) return; queued = { x:clamp(e.clientX/Math.max(innerWidth,1)), y:clamp(1-e.clientY/Math.max(innerHeight,1)), strength:.29, radius:.028 }; last = { x:e.clientX,y:e.clientY,time:e.timeStamp }; wake(3700); }, { passive:true,signal });
    const preference = () => { if (!allowed()) halt(); };
    const mutation = new MutationObserver(preference); mutation.observe(document.documentElement, { attributes:true,attributeFilter:["data-motion"] });
    window.addEventListener("resize", resize, { passive:true,signal }); document.addEventListener("visibilitychange", preference, { signal }); media.addEventListener("change", preference);
    document.documentElement.addEventListener("mouseleave", () => { latest = last = null; }, { signal });
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; canvas.style.visibility = "hidden"; }, { signal });
    resize();
    return () => { halt(); abort.abort(); media.removeEventListener("change", preference); mutation.disconnect(); destroy(); gl.deleteBuffer(buffer); gl.deleteProgram(simulation); gl.deleteProgram(display); };
  }, []);
  return <canvas ref={ref} className="fluid-cursor-canvas" aria-hidden="true" />;
}
