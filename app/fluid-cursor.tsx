"use client";

import { useEffect, useRef } from "react";

const MAX_POINTS = 12;
const TRAIL_LIFETIME = 2.35;

type TrailPoint = {
  x: number;
  y: number;
  energy: number;
  age: number;
};

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_points[${MAX_POINTS}];

float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float denominator = max(dot(ba, ba), 0.000001);
  float h = clamp(dot(pa, ba) / denominator, 0.0, 1.0);
  return length(pa - ba * h);
}

vec3 trailColour(float t) {
  vec3 blue = vec3(0.19, 0.46, 1.0);
  vec3 violet = vec3(0.63, 0.28, 0.92);
  vec3 cyan = vec3(0.08, 0.78, 0.70);
  vec3 rose = vec3(0.72, 0.24, 0.48);
  float phase = fract(t);
  if (phase < 0.33) return mix(blue, violet, phase / 0.33);
  if (phase < 0.66) return mix(violet, cyan, (phase - 0.33) / 0.33);
  return mix(cyan, rose, (phase - 0.66) / 0.34);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 scaledUv = vec2(uv.x * aspect, uv.y);

  vec3 colour = vec3(0.0);
  float alpha = 0.0;

  for (int i = 0; i < ${MAX_POINTS - 1}; i++) {
    vec4 newest = u_points[i];
    vec4 older = u_points[i + 1];
    if (newest.z <= 0.0 || older.z <= 0.0) continue;

    float age = max(newest.w, older.w);
    float life = clamp(1.0 - age / ${TRAIL_LIFETIME.toFixed(2)}, 0.0, 1.0);
    life *= life;
    float energy = mix(older.z, newest.z, 0.55);

    vec2 a = vec2(newest.x * aspect, newest.y);
    vec2 b = vec2(older.x * aspect, older.y);
    vec2 direction = b - a;
    float directionLength = max(length(direction), 0.0001);
    vec2 normal = vec2(-direction.y, direction.x) / directionLength;

    float wave = sin(float(i) * 1.71 + u_time * 1.55 + age * 4.0) * 0.006 * life;
    vec2 warpedA = a + normal * wave;
    vec2 warpedB = b - normal * wave * 0.55;
    float d = segmentDistance(scaledUv, warpedA, warpedB);

    float coreWidth = mix(0.0055, 0.0105, energy);
    float core = exp(-pow(d / coreWidth, 2.0));
    float smoke = exp(-pow(d / (coreWidth * 4.1), 2.0));
    float filament = exp(-pow(d / (coreWidth * 0.42), 2.0));

    float turbulence = 0.72 + 0.28 * sin(
      scaledUv.x * 37.0 + scaledUv.y * 29.0 + u_time * 1.2 + float(i) * 0.93
    );
    float strength = life * energy;
    float ribbon = (core * 0.42 + smoke * 0.11 * turbulence + filament * 0.16) * strength;

    vec3 localColour = trailColour(float(i) * 0.075 + u_time * 0.018 + newest.x * 0.13);
    colour += localColour * ribbon;
    alpha += ribbon * 0.72;
  }

  for (int i = 0; i < 3; i++) {
    vec4 point = u_points[i];
    if (point.z <= 0.0) continue;
    float life = clamp(1.0 - point.w / 1.35, 0.0, 1.0);
    vec2 center = vec2(point.x * aspect, point.y);
    float d = length(scaledUv - center);
    float radius = 0.010 + point.w * 0.038 + float(i) * 0.002;
    float ringWidth = 0.0017 + point.w * 0.0015;
    float ring = exp(-pow(abs(d - radius) / ringWidth, 2.0)) * life * point.z;
    vec3 rippleColour = mix(vec3(0.20, 0.54, 1.0), vec3(0.22, 0.86, 0.72), float(i) / 3.0);
    colour += rippleColour * ring * 0.14;
    alpha += ring * 0.10;
  }

  alpha = clamp(alpha, 0.0, 0.52);
  colour = min(colour, vec3(0.92));
  gl_FragColor = vec4(colour, alpha);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("流体鼠标着色器编译失败：", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("流体鼠标着色器链接失败：", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function FluidCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !window.matchMedia("(pointer: fine)").matches) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      console.warn("当前浏览器不支持 WebGL，已保留静态流光背景。");
      return;
    }

    const program = createProgram(gl);
    if (!program) return;

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const pointsLocation = gl.getUniformLocation(program, "u_points[0]");
    const buffer = gl.createBuffer();
    if (!buffer || positionLocation < 0 || !resolutionLocation || !timeLocation || !pointsLocation) {
      gl.deleteProgram(program);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    let trail: TrailPoint[] = [];
    let frame = 0;
    let previousFrameTime = performance.now();
    let previousPointer: { x: number; y: number; time: number } | null = null;
    const startedAt = performance.now();
    const packedPoints = new Float32Array(MAX_POINTS * 4);

    const motionEnabled = () => {
      const explicit = document.documentElement.dataset.motion;
      if (explicit === "off") return false;
      if (explicit === "on") return true;
      return !reducedMotion.matches;
    };

    const resize = () => {
      const maxWidth = 1920;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25, maxWidth / Math.max(window.innerWidth, 1));
      const width = Math.max(1, Math.round(window.innerWidth * pixelRatio));
      const height = Math.max(1, Math.round(window.innerHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const clear = () => {
      gl.clear(gl.COLOR_BUFFER_BIT);
    };

    const render = (now: number) => {
      const delta = Math.min((now - previousFrameTime) / 1000, 0.05);
      previousFrameTime = now;

      if (!motionEnabled() || document.hidden) {
        trail = [];
        clear();
        frame = 0;
        return;
      }

      trail = trail
        .map((point) => ({ ...point, age: point.age + delta }))
        .filter((point) => point.age < TRAIL_LIFETIME);

      packedPoints.fill(0);
      for (let index = 0; index < trail.length && index < MAX_POINTS; index++) {
        const point = trail[index];
        const offset = index * 4;
        packedPoints[offset] = point.x;
        packedPoints[offset + 1] = point.y;
        packedPoints[offset + 2] = point.energy;
        packedPoints[offset + 3] = point.age;
      }

      clear();
      if (trail.length > 1) {
        gl.useProgram(program);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform1f(timeLocation, (now - startedAt) / 1000);
        gl.uniform4fv(pointsLocation, packedPoints);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      if (trail.length > 0) {
        frame = window.requestAnimationFrame(render);
      } else {
        frame = 0;
      }
    };

    const ensureFrame = () => {
      if (!frame) {
        previousFrameTime = performance.now();
        frame = window.requestAnimationFrame(render);
      }
    };

    const addTrailPoint = (x: number, y: number, energy: number) => {
      trail.unshift({
        x: clamp(x / Math.max(window.innerWidth, 1), 0, 1),
        y: clamp(1 - y / Math.max(window.innerHeight, 1), 0, 1),
        energy,
        age: 0,
      });
      if (trail.length > MAX_POINTS) trail.length = MAX_POINTS;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!motionEnabled()) return;

      const now = performance.now();
      const current = { x: event.clientX, y: event.clientY, time: now };
      const root = document.documentElement;
      const shiftX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 18;
      const shiftY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 14;
      root.style.setProperty("--ambient-dx", `${shiftX.toFixed(2)}px`);
      root.style.setProperty("--ambient-dy", `${shiftY.toFixed(2)}px`);

      if (!previousPointer) {
        addTrailPoint(current.x, current.y, 0.45);
        previousPointer = current;
        ensureFrame();
        return;
      }

      const dx = current.x - previousPointer.x;
      const dy = current.y - previousPointer.y;
      const distance = Math.hypot(dx, dy);
      const elapsed = Math.max(now - previousPointer.time, 8);
      const speed = distance / elapsed * 1000;
      const energy = clamp(0.34 + speed / 1350, 0.34, 1);
      const steps = clamp(Math.ceil(distance / 26), 1, 4);

      for (let step = 1; step <= steps; step++) {
        const ratio = step / steps;
        addTrailPoint(
          previousPointer.x + dx * ratio,
          previousPointer.y + dy * ratio,
          energy * (0.9 + ratio * 0.1),
        );
      }

      previousPointer = current;
      ensureFrame();
    };

    const onPointerLeave = () => {
      previousPointer = null;
      document.documentElement.style.setProperty("--ambient-dx", "0px");
      document.documentElement.style.setProperty("--ambient-dy", "0px");
    };

    const onMotionPreferenceChange = () => {
      if (!motionEnabled()) {
        trail = [];
        clear();
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onPointerLeave);
    window.addEventListener("digital-islands-motion-change", onMotionPreferenceChange);
    reducedMotion.addEventListener("change", onMotionPreferenceChange);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("digital-islands-motion-change", onMotionPreferenceChange);
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
      document.documentElement.style.removeProperty("--ambient-dx");
      document.documentElement.style.removeProperty("--ambient-dy");
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="fluid-cursor-canvas" aria-hidden="true" />;
}
