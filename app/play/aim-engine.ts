import { AIM_COUNT, aimSequence, aimSummary, hitKind, type AimHit } from "./aim-model";
import { motionAllowed, type Dispose } from "./runtime";

type Options = { kind: string; basePath: string; status: (message: string) => void };

/** 只在 Gridwake 封面激活时运行；外层仍负责离屏、后台及 Motion 切换时销毁。 */
export function mountCover(host: HTMLElement, { status }: Options): Dispose {
  const abort = new AbortController();
  const { signal } = abort;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const animations = new Set<Animation>();
  let disposed = false, tick: ReturnType<typeof setInterval> | undefined;
  let started: number | null = null, shownAt = 0, misses = 0, accepting = true;
  const hits: AimHit[] = [];
  const seed = new Uint32Array(1);
  if (typeof globalThis.crypto?.getRandomValues === "function") crypto.getRandomValues(seed);
  else seed[0] = Date.now() >>> 0;
  const positions = aimSequence(seed[0]);

  function node<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = "") {
    const el = document.createElement(tag); el.className = cls; el.textContent = text; return el;
  }
  function later(fn: () => void, ms: number) {
    const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms); timers.add(id);
  }
  function effect(el: HTMLElement, frames: Keyframe[], ms: number) {
    if (!motionAllowed() || !el.animate) { later(() => el.remove(), 260); return; }
    const animation = el.animate(frames, { duration: ms, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" });
    animations.add(animation);
    animation.onfinish = () => { animations.delete(animation); el.remove(); };
  }

  const range = node("div", "aim-range"); range.dataset.phase = "ready";
  const hud = node("div", "aim-hud");
  const identity = node("div", "aim-identity");
  identity.append(node("span", "aim-kicker", "GRIDWAKE / 06"), node("span", "aim-phase", "等待首击"));
  const phase = identity.lastElementChild as HTMLElement;
  hud.append(identity);
  const stats = node("div", "aim-stats");
  function stat(label: string, initial: string) {
    const group = node("div", "aim-stat"); const value = node("span", "aim-stat-value", initial);
    group.append(node("span", "aim-stat-label", label), value); stats.append(group); return value;
  }
  const counter = stat("锁定", "00 / 06");
  const clock = stat("用时", "0.00s");
  const accuracy = stat("命中率", "—");
  hud.append(stats);

  const field = node("div", "target-field aim-field");
  field.setAttribute("role", "group"); field.setAttribute("aria-label", "六点瞄准训练区域");
  const backdrop = node("div", "aim-backdrop"); backdrop.setAttribute("aria-hidden", "true");
  backdrop.append(node("span", "aim-grid-floor"), node("span", "aim-axis aim-axis-x"), node("span", "aim-axis aim-axis-y"));
  const watermark = node("div", "aim-watermark", "SECTOR / 03"); watermark.setAttribute("aria-hidden", "true");
  const rail = node("div", "aim-rail"); rail.setAttribute("aria-label", "六个节点的命中记录");
  const lamps = Array.from({ length: AIM_COUNT }, (_, i) => {
    const lamp = node("span", "aim-lamp", String(i + 1).padStart(2, "0"));
    lamp.setAttribute("aria-label", `节点 ${i + 1}：未命中`); rail.append(lamp); return lamp;
  });
  const guide = node("span", "aim-rail-note", "中心命中 · 冷金色反馈");
  rail.append(guide);
  field.append(backdrop, watermark);
  range.append(hud, field, rail); host.replaceChildren(range);

  const target = node("button", "grid-target aim-target"); target.type = "button";
  // 静态的本地矢量靶标：分段准星、双环、中心点，没有光标追赶或连续旋转。
  target.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><path class="aim-brackets" d="M20 3H10L3 10V20 M44 3H54L61 10V20 M61 44V54L54 61H44 M20 61H10L3 54V44"/><circle class="aim-ring" cx="32" cy="32" r="23"/><circle class="aim-inner" cx="32" cy="32" r="11"/><path class="aim-sights" d="M32 10V17 M32 47V54 M10 32H17 M47 32H54"/><circle class="aim-core" cx="32" cy="32" r="3"/></svg>';
  const targetLabel = node("span", "aim-target-label"); target.append(targetLabel); field.append(target);

  function setStats() {
    counter.textContent = `${String(hits.length).padStart(2, "0")} / 06`;
    const total = hits.length + misses;
    accuracy.textContent = total ? `${Math.round(hits.length / total * 100)}%` : "—";
  }
  function drawTarget(focus = false) {
    if (disposed || hits.length >= AIM_COUNT) return;
    const p = positions[hits.length];
    target.style.left = `${p.x * 100}%`; target.style.top = `${p.y * 100}%`;
    targetLabel.textContent = String(hits.length + 1).padStart(2, "0");
    target.setAttribute("aria-label", `命中节点 ${hits.length + 1}`);
    target.hidden = false; target.disabled = false; accepting = true;
    lamps.forEach((lamp, i) => lamp.classList.toggle("is-current", i === hits.length));
    shownAt = performance.now();
    if (focus) target.focus({ preventScroll: true });
    if (motionAllowed() && target.firstElementChild?.animate) {
      const animation = target.firstElementChild.animate([{ transform: "scale(.84)", opacity: .4 }, { transform: "scale(1)", opacity: 1 }], { duration: 170, easing: "ease-out" });
      animations.add(animation); animation.onfinish = () => animations.delete(animation);
    }
  }
  function impact(x: number, y: number, kind: "center" | "hit" | "keyboard" | "miss") {
    // 射击特效有数量上限；点击频率很高时也不积累 DOM 与动画对象。
    if (field.querySelectorAll(".aim-impact").length >= 8) return;
    const mark = node("div", `aim-impact aim-impact-${kind}`); mark.style.left = `${x}px`; mark.style.top = `${y}px`;
    mark.setAttribute("aria-hidden", "true");
    const ring = node("span", "aim-impact-ring");
    const caption = node("span", "aim-impact-label", kind === "center" ? "中心命中" : kind === "miss" ? "偏离" : "命中");
    mark.append(ring, caption);
    if (kind !== "miss") for (let i = 0; i < 4; i++) { const ray = node("i", "aim-impact-ray"); ray.style.setProperty("--ray-angle", `${45 + i * 90}deg`); mark.append(ray); }
    field.append(mark);
    effect(mark, [{ opacity: 1, transform: "translate(-50%,-50%) scale(.82)" }, { opacity: 0, transform: "translate(-50%,-50%) scale(1.55)" }], kind === "miss" ? 340 : 540);
  }
  function finish(now: number) {
    accepting = false; target.hidden = true; clearInterval(tick);
    range.dataset.phase = "complete"; phase.textContent = "校准完成";
    field.querySelectorAll(".aim-impact").forEach(mark => mark.remove());
    lamps.forEach(lamp => lamp.classList.remove("is-current"));
    const result = aimSummary(hits, misses, started === null ? 0 : now - started);
    clock.textContent = `${(result.elapsedMs / 1000).toFixed(2)}s`;
    const panel = node("div", "aim-results"); panel.setAttribute("tabindex", "-1");
    panel.setAttribute("aria-label", "本轮六点瞄准成绩");
    panel.append(node("span", "aim-result-kicker", "CALIBRATION / COMPLETE"), node("strong", "aim-result-title", "SECTOR CLEAR"));
    const summary = node("div", "aim-result-stats");
    for (const [label, value] of [
      ["首击后用时", `${(result.elapsedMs / 1000).toFixed(2)}s`],
      ["命中率", `${result.accuracy}%`],
      ["平均响应", result.meanResponseMs === null ? "—" : `${result.meanResponseMs}ms`],
      ["中心命中", result.pointerHits ? `${result.centers} / ${result.pointerHits}` : "—"],
    ]) { const cell = node("div", "aim-result-stat"); cell.append(node("strong", "", value), node("span", "", label)); summary.append(cell); }
    panel.append(summary);
    panel.append(node("p", "aim-result-note", result.assisted ? "含键盘辅助操作 · 不与鼠标精度比较" : "再试一次，看看能否更从容地命中中心。"));
    field.append(panel);
    // 最后一次键盘命中后把焦点留在结果，不丢回文档顶部。
    if (hits.at(-1)?.kind === "keyboard") panel.focus({ preventScroll: true });
    status(`六个节点已点亮 · 首次命中后用时 ${(result.elapsedMs / 1000).toFixed(2)} 秒 · 空击 ${misses} 次。点击上方“重来”开始新一轮。`);
  }
  target.addEventListener("click", e => {
    e.stopPropagation();
    if (!accepting || disposed || hits.length >= AIM_COUNT) return;
    accepting = false;
    const now = performance.now();
    const keyboard = e.detail === 0;
    const bounds = target.getBoundingClientRect(), surface = field.getBoundingClientRect();
    const cx = bounds.left + bounds.width / 2, cy = bounds.top + bounds.height / 2;
    const kind = hitKind(e.clientX - cx, e.clientY - cy, bounds.width / 2, keyboard);
    hits.push({ kind, responseMs: started === null ? null : Math.max(0, now - shownAt) });
    if (started === null) {
      started = now; phase.textContent = "校准进行中"; range.dataset.phase = "active";
      // HUD 只每 100ms 更新一次，不新增常驻 RAF。
      tick = setInterval(() => { if (!disposed && started !== null) clock.textContent = `${((performance.now() - started) / 1000).toFixed(2)}s`; }, 100);
    }
    const lamp = lamps[hits.length - 1]; lamp.dataset.hit = kind;
    lamp.setAttribute("aria-label", `节点 ${hits.length}：${kind === "center" ? "中心命中" : kind === "keyboard" ? "键盘命中" : "命中"}`);
    impact(cx - surface.left, cy - surface.top, kind); setStats();
    if (hits.length === AIM_COUNT) { finish(now); return; }
    target.hidden = true; target.disabled = true;
    status(`${hits.length} / 6 节点已点亮 · ${kind === "center" ? "中心命中" : "命中"} · 空击 ${misses} 次。`);
    // 短暂留出命中反馈；使用新位置直接显现，不把靶标拖成一条移动尾巴。
    later(() => drawTarget(keyboard), motionAllowed() ? 130 : 0);
  }, { signal });
  field.addEventListener("click", e => {
    // 目标切换期间不把双击第二下误判为空击；结果面板也不会再计分。
    if (!accepting || disposed || hits.length >= AIM_COUNT) return;
    misses++; setStats();
    const bounds = field.getBoundingClientRect(); impact(e.clientX - bounds.left, e.clientY - bounds.top, "miss");
    status(`${hits.length} / 6 节点 · 空击 ${misses} 次。目标中心的细点更精确。`);
  }, { signal });
  drawTarget();
  status("依次点亮六个信标，中心命中会留下冷金色印记。首击后计时；也支持 Tab / Enter。");
  return () => {
    disposed = true; abort.abort(); clearInterval(tick);
    timers.forEach(id => clearTimeout(id)); timers.clear();
    animations.forEach(animation => { animation.onfinish = null; animation.cancel(); }); animations.clear();
    host.replaceChildren();
  };
}
