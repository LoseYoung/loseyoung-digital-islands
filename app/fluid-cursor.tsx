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

/*
 * 使用双缓冲高度场求解离散波动方程。
 * 鼠标只向水面注入局部扰动，后续扩散由高度场自身完成，
 * 因此不会把历史鼠标点连成一条“尾巴”。
 */
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

  // 二阶波动方程：邻域传播 - 上一帧高度，再施加轻微阻尼。
  float nextHeight = (left + right + down + up) * 0.5 - previous;
  nextHeight *= 0.986;

  if (u_splatStrength > 0.0) {
    vec2 delta = v_uv - u_splat;
    delta.x *= u_resolution.x / max(u_resolution.y, 1.0);
    float impulse = exp(-dot(delta, delta) / max(u_splatRadius * u_splatRadius, 0.000001));
    // 正负相间的短脉冲比单向鼓包更像水面被轻触后产生的波峰/波谷。
    nextHeight += impulse * u_splatStrength;
  }

  nextHeight = clamp(nextHeight, -0.92, 0.92);
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

vec3 spectralColour(vec2 uv, float heightValue, float gradientValue) {
  vec3 blue = vec3(0.15, 0.42, 0.92);
  vec3 violet = vec3(0.52, 0.24, 0.76);
  vec3 cyan = vec3(0.08, 0.66, 0.63);
  vec3 rose = vec3(0.55, 0.20, 0.38);

  float drift = 0.5 + 0.5 * sin(u_time * 0.28 + uv.x * 5.2 - uv.y * 3.4);
  vec3 cold = mix(blue, violet, drift);
  vec3 warm = mix(cyan, rose, 0.35 + 0.25 * sin(u_time * 0.19 + uv.y * 5.0));
  float mixValue = clamp(gradientValue * 8.0 + abs(heightValue) * 1.8, 0.0, 1.0);
  return mix(cold, warm, mixValue * 0.62);
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

  // 主要显示波前的法线高光，中心扰动保持透明，避免重新变成“大光圈”。
  float ridge = smoothstep(0.008, 0.095, gradientStrength) * (1.0 - smoothstep(0.19, 0.42, gradientStrength));
  float body = smoothstep(0.018, 0.18, waveStrength) * 0.18;
  float shimmer = pow(max(dot(normalize(vec3(-gradient * 7.0, 1.0)), normalize(vec3(-0.35, 0.55, 0.78))), 0.0), 10.0);

  float alpha = clamp(ridge * 0.34 + body * 0.16 + shimmer * ridge * 0.16, 0.0, 0.34);
  vec3 colour = spectralColour(v_uv, center, gradientStrength);
  colour *= 0.55 + ridge * 0.75 + shimmer * 0.55;

  outColor = vec4(colour, alpha);
}
`;

type RippleImpulse = {
  x: number;
  y: number;
  strength: number;
  radius: number;
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
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

  return { texture, framebuffer };
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
      console.warn("当前浏览器不支持 WebGL2，已保留静态流光背景。");
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
    let previousPointer: { x: number; y: number; time: number } | null = null;
    const impulses: RippleImpulse[] = [];
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

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
      const width = Math.max(1, Math.round(window.innerWidth * pixelRatio));
      const height = Math.max(1, Math.round(window.innerHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const longest = Math.min(760, Math.max(420, Math.round(Math.max(window.innerWidth, window.innerHeight) * 0.5)));
      const aspect = Math.max(window.innerWidth / Math.max(window.innerHeight, 1), 0.35);
      const nextWidth = aspect >= 1 ? longest : Math.max(260, Math.round(longest * aspect));
      const nextHeight = aspect >= 1 ? Math.max(260, Math.round(longest / aspect)) : longest;

      if (nextWidth !== simulationWidth || nextHeight !== simulationHeight || !front || !back) {
        destroyTargets();
        simulationWidth = nextWidth;
        simulationHeight = nextHeight;
        front = createStateTarget(gl, simulationWidth, simulationHeight);
        back = createStateTarget(gl, simulationWidth, simulationHeight);
        impulses.length = 0;
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

    const render = (now: number) => {
      if (!motionEnabled() || document.hidden || !front || !back) {
        clearCanvas();
        frame = 0;
        return;
      }

      // 每帧至少推进两次波动方程，让波前扩散足够顺滑；注入只发生在第一步。
      const impulse = impulses.shift();
      simulationStep(impulse);
      simulationStep();
      if (impulses.length > 0) simulationStep(impulses.shift());
      display(now);

      if (now < activeUntil || impulses.length > 0) {
        frame = window.requestAnimationFrame(render);
      } else {
        frame = 0;
      }
    };

    const ensureFrame = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const enqueueRipple = (x: number, y: number, strength: number, radius: number) => {
      impulses.push({
        x: clamp(x / Math.max(window.innerWidth, 1), 0, 1),
        y: clamp(1 - y / Math.max(window.innerHeight, 1), 0, 1),
        strength,
        radius,
      });
      if (impulses.length > 4) impulses.splice(0, impulses.length - 4);
      activeUntil = performance.now() + 3600;
      ensureFrame();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!motionEnabled()) return;

      const now = performance.now();
      const current = { x: event.clientX, y: event.clientY, time: now };
      const root = document.documentElement;
      const shiftX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 10;
      const shiftY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 8;
      root.style.setProperty("--ambient-dx", `${shiftX.toFixed(2)}px`);
      root.style.setProperty("--ambient-dy", `${shiftY.toFixed(2)}px`);

      if (!previousPointer) {
        previousPointer = current;
        enqueueRipple(current.x, current.y, 0.18, 0.014);
        return;
      }

      const dx = current.x - previousPointer.x;
      const dy = current.y - previousPointer.y;
      const distance = Math.hypot(dx, dy);
      const elapsed = Math.max(now - previousPointer.time, 1);

      // 不沿路径连续画线：只有移动达到一定距离/时间才注入新的独立水面扰动。
      if (distance >= 34 || elapsed >= 58) {
        const speed = distance / elapsed * 1000;
        const strength = clamp(0.14 + speed / 9000, 0.14, 0.28);
        const radius = clamp(0.011 + speed / 150000, 0.011, 0.021);
        enqueueRipple(current.x, current.y, strength, radius);
        previousPointer = current;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!motionEnabled()) return;
      enqueueRipple(event.clientX, event.clientY, 0.32, 0.019);
    };

    const onPointerLeave = () => {
      previousPointer = null;
      document.documentElement.style.setProperty("--ambient-dx", "0px");
      document.documentElement.style.setProperty("--ambient-dy", "0px");
    };

    const onMotionPreferenceChange = () => {
      if (!motionEnabled()) {
        impulses.length = 0;
        activeUntil = 0;
        clearCanvas();
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
      document.documentElement.style.removeProperty("--ambient-dx");
      document.documentElement.style.removeProperty("--ambient-dy");
      destroyTargets();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(simulationProgram);
      gl.deleteProgram(displayProgram);
    };
  }, []);

  return <canvas ref={canvasRef} className="fluid-cursor-canvas" aria-hidden="true" />;
}
