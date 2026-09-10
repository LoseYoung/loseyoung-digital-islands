"use client";

import { useEffect, useRef } from "react";

const vertexShaderSource = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const simulationFragmentSource = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_state;
uniform vec2 u_texel;
uniform vec2 u_resolution;
uniform vec2 u_splat;
uniform float u_splatStrength;
uniform float u_splatRadius;

float decodeHeight(float value) {
  return value * 2.0 - 1.0;
}

float encodeHeight(float value) {
  return value * 0.5 + 0.5;
}

void main() {
  float current = decodeHeight(texture(u_state, v_uv).r);
  float previous = decodeHeight(texture(u_state, v_uv).g);
  float left = decodeHeight(texture(u_state, v_uv - vec2(u_texel.x, 0.0)).r);
  float right = decodeHeight(texture(u_state, v_uv + vec2(u_texel.x, 0.0)).r);
  float down = decodeHeight(texture(u_state, v_uv - vec2(0.0, u_texel.y)).r);
  float up = decodeHeight(texture(u_state, v_uv + vec2(0.0, u_texel.y)).r);

  float nextHeight = (left + right + down + up) * 0.5 - previous;
  nextHeight *= 0.974;

  if (u_splatStrength > 0.0) {
    vec2 delta = v_uv - u_splat;
    delta.x *= u_resolution.x / max(u_resolution.y, 1.0);
    float impulse = exp(-dot(delta, delta) / max(u_splatRadius * u_splatRadius, 0.000001));
    nextHeight += impulse * u_splatStrength;
  }

  nextHeight = clamp(nextHeight, -0.86, 0.86);
  outColor = vec4(encodeHeight(nextHeight), encodeHeight(current), 0.0, 1.0);
}
`;

const displayFragmentSource = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_state;
uniform vec2 u_texel;
uniform float u_time;

float heightAt(vec2 uv) {
  return texture(u_state, uv).r * 2.0 - 1.0;
}

vec3 glassTint(vec2 uv, float gradientStrength) {
  vec3 moonSilver = vec3(0.72, 0.82, 0.91);
  vec3 nightBlue = vec3(0.28, 0.48, 0.67);
  vec3 iceCyan = vec3(0.24, 0.62, 0.64);
  vec3 violet = vec3(0.43, 0.40, 0.56);

  float drift = 0.5 + 0.5 * sin(u_time * 0.12 + uv.x * 3.4 - uv.y * 2.1);
  vec3 tint = mix(moonSilver, nightBlue, 0.28 + drift * 0.08);
  tint = mix(tint, iceCyan, clamp(gradientStrength * 2.2, 0.0, 0.15));
  return mix(tint, violet, 0.025);
}

void main() {
  float center = heightAt(v_uv);
  float left = heightAt(v_uv - vec2(u_texel.x, 0.0));
  float right = heightAt(v_uv + vec2(u_texel.x, 0.0));
  float down = heightAt(v_uv - vec2(0.0, u_texel.y));
  float up = heightAt(v_uv + vec2(0.0, u_texel.y));

  vec2 gradient = vec2(right - left, up - down);
  float gradientStrength = length(gradient);
  float waveStrength = abs(center);

  vec3 normal = normalize(vec3(-gradient * 7.5, 1.0));
  vec3 lightDirection = normalize(vec3(-0.30, 0.50, 0.81));
  float specular = pow(max(dot(normal, lightDirection), 0.0), 22.0);
  float fresnel = pow(1.0 - clamp(normal.z, 0.0, 1.0), 2.2);

  float ridge = smoothstep(0.006, 0.058, gradientStrength)
    * (1.0 - smoothstep(0.14, 0.27, gradientStrength));
  float innerRefraction = smoothstep(0.028, 0.13, waveStrength) * 0.028;

  // 透明水体：主体几乎不可见，只保留波峰、法线高光与极轻折射。
  float alpha = clamp(
    ridge * 0.17
    + specular * ridge * 0.105
    + fresnel * 0.045
    + innerRefraction,
    0.0,
    0.20
  );

  vec3 colour = glassTint(v_uv, gradientStrength);
  colour *= 0.70 + specular * 0.52 + fresnel * 0.18;

  outColor = vec4(colour, alpha);
}
`;

type RippleImpulse = {
  x: number;
  y: number;
  strength: number;
  radius: number;
};

type PointerSample = {
  x: number;
  y: number;
  time: number;
};

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("水波着色器编译失败：", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, fragmentSource: string) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("水波着色器链接失败：", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function createStateTarget(gl: WebGL2RenderingContext, width: number, height: number) {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) return null;

  const neutral = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index++) {
    const offset = index * 4;
    neutral[offset] = 128;
    neutral[offset + 1] = 128;
    neutral[offset + 2] = 0;
    neutral[offset + 3] = 255;
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, neutral);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    return null;
  }

  return { texture, framebuffer, neutral };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function FluidCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !window.matchMedia("(pointer: fine)").matches) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });

    if (!gl) {
      console.warn("当前浏览器不支持 WebGL2，已保留纯色背景。");
      return;
    }

    const simulationProgram = createProgram(gl, simulationFragmentSource);
    const displayProgram = createProgram(gl, displayFragmentSource);
    if (!simulationProgram || !displayProgram) return;

    const buffer = gl.createBuffer();
    if (!buffer) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    const simulationPosition = gl.getAttribLocation(simulationProgram, "a_position");
    const displayPosition = gl.getAttribLocation(displayProgram, "a_position");
    const simulationUniforms = {
      state: gl.getUniformLocation(simulationProgram, "u_state"),
      texel: gl.getUniformLocation(simulationProgram, "u_texel"),
      resolution: gl.getUniformLocation(simulationProgram, "u_resolution"),
      splat: gl.getUniformLocation(simulationProgram, "u_splat"),
      strength: gl.getUniformLocation(simulationProgram, "u_splatStrength"),
      radius: gl.getUniformLocation(simulationProgram, "u_splatRadius"),
    };
    const displayUniforms = {
      state: gl.getUniformLocation(displayProgram, "u_state"),
      texel: gl.getUniformLocation(displayProgram, "u_texel"),
      time: gl.getUniformLocation(displayProgram, "u_time"),
    };

    if (
      simulationPosition < 0 || displayPosition < 0 ||
      Object.values(simulationUniforms).some((value) => value === null) ||
      Object.values(displayUniforms).some((value) => value === null)
    ) {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(simulationProgram);
      gl.deleteProgram(displayProgram);
      return;
    }

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    let simulationWidth = 1;
    let simulationHeight = 1;
    let front: ReturnType<typeof createStateTarget> = null;
    let back: ReturnType<typeof createStateTarget> = null;
    let frame = 0;
    let activeUntil = 0;
    let latestPointer: PointerSample | null = null;
    let lastInjectedPointer: PointerSample | null = null;
    let queuedImpulse: RippleImpulse | null = null;
    let idleResetPending = false;
    const startedAt = performance.now();

    const motionEnabled = () => {
      const explicit = document.documentElement.dataset.motion;
      if (explicit === "off") return false;
      if (explicit === "on") return true;
      return !reducedMotion.matches;
    };

    const bindPosition = (program: WebGLProgram, location: number) => {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    };

    const destroyTargets = () => {
      if (front) {
        gl.deleteFramebuffer(front.framebuffer);
        gl.deleteTexture(front.texture);
      }
      if (back) {
        gl.deleteFramebuffer(back.framebuffer);
        gl.deleteTexture(back.texture);
      }
      front = null;
      back = null;
    };

    const resetTarget = (target: NonNullable<typeof front>) => {
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        simulationWidth,
        simulationHeight,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        target.neutral,
      );
    };

    const resetSimulation = () => {
      if (front) resetTarget(front);
      if (back) resetTarget(back);
      idleResetPending = false;
    };

    const resize = () => {
      const width = Math.max(1, Math.round(window.innerWidth));
      const height = Math.max(1, Math.round(window.innerHeight));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const longest = Math.min(500, Math.max(330, Math.round(Math.max(window.innerWidth, window.innerHeight) * 0.32)));
      const aspect = Math.max(window.innerWidth / Math.max(window.innerHeight, 1), 0.35);
      const nextWidth = aspect >= 1 ? longest : Math.max(210, Math.round(longest * aspect));
      const nextHeight = aspect >= 1 ? Math.max(210, Math.round(longest / aspect)) : longest;

      if (nextWidth !== simulationWidth || nextHeight !== simulationHeight || !front || !back) {
        destroyTargets();
        simulationWidth = nextWidth;
        simulationHeight = nextHeight;
        front = createStateTarget(gl, simulationWidth, simulationHeight);
        back = createStateTarget(gl, simulationWidth, simulationHeight);
        latestPointer = null;
        lastInjectedPointer = null;
        queuedImpulse = null;
        idleResetPending = false;
      }
    };

    const clearCanvas = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
    };

    const simulationStep = (impulse?: RippleImpulse) => {
      if (!front || !back) return;
      bindPosition(simulationProgram, simulationPosition);
      gl.bindFramebuffer(gl.FRAMEBUFFER, back.framebuffer);
      gl.viewport(0, 0, simulationWidth, simulationHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, front.texture);
      gl.uniform1i(simulationUniforms.state, 0);
      gl.uniform2f(simulationUniforms.texel, 1 / simulationWidth, 1 / simulationHeight);
      gl.uniform2f(simulationUniforms.resolution, simulationWidth, simulationHeight);
      gl.uniform2f(simulationUniforms.splat, impulse?.x ?? 0.5, impulse?.y ?? 0.5);
      gl.uniform1f(simulationUniforms.strength, impulse?.strength ?? 0);
      gl.uniform1f(simulationUniforms.radius, impulse?.radius ?? 0.02);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      [front, back] = [back, front];
    };

    const display = (now: number) => {
      if (!front) return;
      bindPosition(displayProgram, displayPosition);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, front.texture);
      gl.uniform1i(displayUniforms.state, 0);
      gl.uniform2f(displayUniforms.texel, 1 / simulationWidth, 1 / simulationHeight);
      gl.uniform1f(displayUniforms.time, (now - startedAt) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const toImpulse = (sample: PointerSample): RippleImpulse | null => {
      if (!lastInjectedPointer) {
        lastInjectedPointer = sample;
        return {
          x: clamp(sample.x / Math.max(window.innerWidth, 1), 0, 1),
          y: clamp(1 - sample.y / Math.max(window.innerHeight, 1), 0, 1),
          strength: 0.145,
          radius: 0.014,
        };
      }

      const dx = sample.x - lastInjectedPointer.x;
      const dy = sample.y - lastInjectedPointer.y;
      const distance = Math.hypot(dx, dy);
      const elapsed = Math.max(sample.time - lastInjectedPointer.time, 1);
      if (distance < 26 && elapsed < 56) return null;

      const speed = distance / elapsed * 1000;
      lastInjectedPointer = sample;
      return {
        x: clamp(sample.x / Math.max(window.innerWidth, 1), 0, 1),
        y: clamp(1 - sample.y / Math.max(window.innerHeight, 1), 0, 1),
        strength: clamp(0.12 + speed / 12000, 0.12, 0.22),
        radius: clamp(0.011 + speed / 200000, 0.011, 0.018),
      };
    };

    const render = (now: number) => {
      if (!motionEnabled() || document.hidden || !front || !back) {
        clearCanvas();
        frame = 0;
        return;
      }

      if (latestPointer) {
        const sampled = latestPointer;
        latestPointer = null;
        const pointerImpulse = toImpulse(sampled);
        if (pointerImpulse) queuedImpulse = pointerImpulse;
      }

      const impulse = queuedImpulse ?? undefined;
      queuedImpulse = null;
      simulationStep(impulse);
      display(now);

      if (now < activeUntil || latestPointer || queuedImpulse) {
        frame = window.requestAnimationFrame(render);
      } else {
        clearCanvas();
        frame = 0;
        if (idleResetPending) resetSimulation();
      }
    };

    const ensureFrame = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const wake = (milliseconds = 2350) => {
      activeUntil = performance.now() + milliseconds;
      idleResetPending = true;
      ensureFrame();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!motionEnabled()) return;
      latestPointer = { x: event.clientX, y: event.clientY, time: performance.now() };
      wake();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!motionEnabled()) return;
      queuedImpulse = {
        x: clamp(event.clientX / Math.max(window.innerWidth, 1), 0, 1),
        y: clamp(1 - event.clientY / Math.max(window.innerHeight, 1), 0, 1),
        strength: 0.25,
        radius: 0.018,
      };
      lastInjectedPointer = { x: event.clientX, y: event.clientY, time: performance.now() };
      wake(2550);
    };

    const onPointerLeave = () => {
      latestPointer = null;
      lastInjectedPointer = null;
    };

    const onMotionPreferenceChange = () => {
      if (!motionEnabled()) {
        latestPointer = null;
        queuedImpulse = null;
        activeUntil = 0;
        clearCanvas();
        resetSimulation();
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.documentElement.addEventListener("mouseleave", onPointerLeave);
    window.addEventListener("digital-islands-motion-change", onMotionPreferenceChange);
    reducedMotion.addEventListener("change", onMotionPreferenceChange);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("digital-islands-motion-change", onMotionPreferenceChange);
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
      destroyTargets();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(simulationProgram);
      gl.deleteProgram(displayProgram);
    };
  }, []);

  return <canvas ref={canvasRef} className="fluid-cursor-canvas" aria-hidden="true" />;
}
