import { clamp, makeSkipPlan, pointOnHop, releaseVelocity, type Point, type Hop } from "./physics";
import { motionAllowed, PLAY_EVENT, watchRest } from "./runtime";

/** 首屏局部的星体轨迹 + 透视水圈。不增加第二套全屏 WebGL。 */
export function mountStar(host: HTMLElement, report: (message: string) => void) {
  const button = host.querySelector<HTMLButtonElement>(".throw-star")!;
  const canvas = host.querySelector<HTMLCanvasElement>("canvas")!;
  const ctx = canvas.getContext("2d");
  if (!ctx) { button.hidden = true; return () => {}; }
  const abort = new AbortController(), { signal } = abort;
  let width = 1, height = 1, frame = 0, plan: Hop[] = [], index = 0, hopStart = 0, busy = false;
  let rings: { x: number; y: number; at: number; scale: number }[] = [];
  let trail: Point[] = [];
  let pointer: number | null = null, dragged = false, origin: Point = { x: .82, y: .14 };
  let samples: { point: Point; time: number }[] = [];
  let suppressClick = false;

  const restore = () => {
    button.style.removeProperty("left"); button.style.removeProperty("top");
    button.dataset.flying = "false"; button.dataset.dragging = "false";
    button.setAttribute("aria-busy", "false");
  };
  const cancel = () => {
    cancelAnimationFrame(frame); frame = 0; busy = false; rings = []; trail = []; plan = [];
    if (pointer !== null && button.hasPointerCapture(pointer)) button.releasePointerCapture(pointer);
    pointer = null; samples = []; restore(); ctx.clearRect(0, 0, width, height);
  };
  const resize = () => {
    cancel(); const rect = host.getBoundingClientRect(); width = rect.width; height = rect.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.25, 1600 / Math.max(width, height, 1));
    canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const local = (event: PointerEvent): Point => {
    const rect = host.getBoundingClientRect();
    return { x: clamp((event.clientX - rect.left) / Math.max(rect.width, 1), .04, .96), y: clamp((event.clientY - rect.top) / Math.max(rect.height, 1), .03, .86) };
  };
  const star = (p: Point, alpha = 1) => {
    ctx.globalAlpha = alpha; ctx.fillStyle = "#eef4df"; ctx.shadowColor = "#d7e9ee"; ctx.shadowBlur = 16;
    const x = p.x * width, y = p.y * height;
    ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 3, y - 2); ctx.lineTo(x + 7, y); ctx.lineTo(x + 2, y + 2); ctx.lineTo(x, y + 7); ctx.lineTo(x - 2, y + 2); ctx.lineTo(x - 7, y); ctx.lineTo(x - 2, y - 2); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  };
  const drawRings = (now: number) => {
    rings = rings.filter(r => now - r.at < 2000);
    for (const ring of rings) {
      const t = Math.max(0, (now - ring.at) / 2000);
      for (let band = 0; band < 3; band++) {
        const age = t - band * .10; if (age <= 0) continue;
        const radius = (8 + age * Math.min(width * .14, 190)) * ring.scale;
        ctx.strokeStyle = `rgba(209, 229, 234, ${Math.max(0, (1 - t) * (.48 - band * .09))})`;
        ctx.lineWidth = band ? 1 : 1.5;
        ctx.beginPath(); ctx.ellipse(ring.x * width, ring.y * height, radius, radius * .24, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  };
  const render = (now: number) => {
    frame = 0; ctx.clearRect(0, 0, width, height);
    // 按时间推进，而不是按帧数；卡顿时可跨过多段，但每个落点只触发一次。
    while (index < plan.length && now - hopStart >= plan[index].duration * 1000) {
      hopStart += plan[index].duration * 1000;
      rings.push({ ...plan[index].to, at: hopStart, scale: 1 - index * .085 }); index++;
    }
    drawRings(now);
    if (index < plan.length) {
      const position = pointOnHop(plan[index], (now - hopStart) / (plan[index].duration * 1000));
      trail.push(position); if (trail.length > 8) trail.shift();
      trail.forEach((p, i) => { ctx.fillStyle = `rgba(202,223,235,${i / trail.length * .18})`; ctx.beginPath(); ctx.arc(p.x * width, p.y * height, 1.3, 0, Math.PI * 2); ctx.fill(); });
      star(position);
    } else if (busy) {
      busy = false; restore(); trail = [];
      report(plan.length === 1 ? "轻轻落水，一圈涟漪。横着甩得更快，可以跳得更远。" : `这颗星，跳过了 ${plan.length} 次海面。再试一次，让它去往不同的地方。`);
    }
    if (busy || rings.length) frame = requestAnimationFrame(render);
  };
  const launch = (start: Point, velocity: Point) => {
    cancelAnimationFrame(frame); ctx.clearRect(0, 0, width, height);
    plan = makeSkipPlan(start, velocity); index = 0; hopStart = performance.now(); rings = []; trail = [];
    if (!motionAllowed()) {
      // 减少动态效果时提供等价结果和静态落点，不强行播放飞行。
      rings = plan.map((hop, i) => ({ ...hop.to, at: hopStart - 500, scale: 1 - i * .085 }));
      drawRings(hopStart); restore(); busy = false;
      report(`静态模式：这次投掷落水 ${plan.length} 次。开启 Motion 后可观看完整轨迹。`); return;
    }
    busy = true; button.dataset.flying = "true"; button.setAttribute("aria-busy", "true");
    report("星光正掠过海面……"); frame = requestAnimationFrame(render);
  };
  const announce = () => window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: "star" }));
  button.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0 || busy) return;
    event.stopPropagation(); announce(); pointer = event.pointerId; dragged = false; suppressClick = false;
    origin = local(event); samples = [{ point: origin, time: event.timeStamp }];
    button.setPointerCapture(pointer); button.dataset.dragging = "true";
  }, { signal });
  button.addEventListener("pointermove", event => {
    if (pointer !== event.pointerId) return;
    event.stopPropagation(); const p = local(event); const time = event.timeStamp;
    dragged ||= Math.hypot((p.x - origin.x) * width, (p.y - origin.y) * height) > 8;
    samples.push({ point: p, time });
    // 不能把低帧率下超过采样窗口的前一点全部删掉，否则快甩会被误算为零速度。
    while (samples.length > 2 && (time - samples[1].time > 150 || samples.length > 16)) samples.shift();
    if (dragged) { button.style.left = `${p.x * 100}%`; button.style.top = `${p.y * 100}%`; }
  }, { signal });
  button.addEventListener("pointerup", event => {
    if (pointer !== event.pointerId) return;
    event.stopPropagation(); const end = local(event); const now = event.timeStamp;
    pointer = null; button.dataset.dragging = "false";
    if (dragged) {
      suppressClick = true;
      launch(end, releaseVelocity(samples, end, now));
    } else restore();
  }, { signal });
  button.addEventListener("click", event => {
    event.stopPropagation();
    if (suppressClick) { suppressClick = false; return; }
    if (busy) return;
    announce(); const rect = button.getBoundingClientRect(), parent = host.getBoundingClientRect();
    launch({ x: (rect.left + rect.width / 2 - parent.left) / width, y: (rect.top + rect.height / 2 - parent.top) / height }, { x: -.95, y: .22 });
  }, { signal });
  button.addEventListener("pointercancel", cancel, { signal });
  button.addEventListener("lostpointercapture", () => { if (pointer !== null) cancel(); }, { signal });
  host.addEventListener("keydown", event => { if (event.key === "Escape") { cancel(); report("星光回到了原处。 "); } }, { signal });
  window.addEventListener(PLAY_EVENT, event => { if ((event as CustomEvent).detail !== "star") cancel(); }, { signal });
  const unwatch = watchRest(host, cancel);
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  return () => { cancel(); abort.abort(); observer.disconnect(); unwatch(); };
}
