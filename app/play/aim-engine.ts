import { AIM_COUNT, aimSequence, aimSummary, hitKind, type AimHit } from "./aim-model";
import { session } from "./session";
import { challengeSeed, compareAttempt, type Attempt } from "./story-model";
import { motionAllowed, type Dispose } from "./runtime";

type Options = { kind: string; basePath: string; status: (message: string) => void };

/** 可暂停的瞄准练习；中断、尺寸变化及混合输入不进入同题比较。 */
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
  const linkedSeed = challengeSeed(new URL(location.href).searchParams.get("aim"));
  if (linkedSeed !== null) seed[0] = linkedSeed;
  let positions = aimSequence(seed[0]), previous: Attempt | null = null, completed: Attempt | null = null;
  let pausedAt: number | null = null, pausedMs = 0, interrupted = false, suspended = false;
  let spec = "", viewSize = "";
  const inputs = new Set<string>();
  const elapsed = (now = performance.now()) => started === null ? 0 : Math.max(0, now - started - pausedMs - (pausedAt === null ? 0 : now - pausedAt));
  const countInput = (event: MouseEvent) => inputs.add(event.detail === 0 ? "keyboard" : (event as PointerEvent).pointerType || "mouse");

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
  const actions = node("div", "aim-actions");
  range.append(hud, field, rail, actions); host.replaceChildren(range);

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
    if (disposed || suspended || hits.length >= AIM_COUNT) return;
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
    const result = aimSummary(hits, misses, elapsed(now));
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
    const key = `${seed[0]}:v2:${spec}:${[...inputs].sort().join("+")}`;
    completed = { key, elapsed: result.elapsedMs, responses: hits.map(h => h.responseMs), interrupted: interrupted || inputs.size !== 1 || result.assisted };
    const comparison = compareAttempt(previous, completed);
    panel.append(node("p", "aim-result-note", interrupted ? "中断练习 / 场地变化 · 本轮不参与成绩比较" : result.assisted ? "含键盘辅助操作 · 不与鼠标精度比较" : "同题再来一局，比较这六次动作。"));
    const delta = node("p", "aim-comparison", comparison ? `比上一局${comparison.elapsed <= 0 ? "快" : "慢"} ${Math.abs(comparison.elapsed / 1000).toFixed(2)} 秒` : "同种子、同尺寸、同输入的连续回合才比较。");
    panel.append(delta);
    if (comparison) {
      const splits = node("div", "aim-splits");
      comparison.responses.forEach((v, i) => splits.append(node("span", "", `${i + 1}: ${v === null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v)}ms`}`)));
      panel.append(splits);
    }
    field.append(panel);
    // 最后一次键盘命中后把焦点留在结果，不丢回文档顶部。
    if (hits.at(-1)?.kind === "keyboard") panel.focus({ preventScroll: true });
    status(`六个节点已点亮 · 首次命中后用时 ${(result.elapsedMs / 1000).toFixed(2)} 秒 · 空击 ${misses} 次。点击上方“重来”开始新一轮。`);
  }
  target.addEventListener("click", e => {
    e.stopPropagation();
    if (!accepting || disposed || suspended || hits.length >= AIM_COUNT) return;
    countInput(e);
    accepting = false;
    const now = performance.now();
    const keyboard = e.detail === 0;
    const bounds = target.getBoundingClientRect(), surface = field.getBoundingClientRect();
    const cx = bounds.left + bounds.width / 2, cy = bounds.top + bounds.height / 2;
    const kind = hitKind(e.clientX - cx, e.clientY - cy, bounds.width / 2, keyboard);
    hits.push({ kind, responseMs: started === null ? null : Math.max(0, now - shownAt) });
    if (started === null) {
      started = now;
      spec = `${Math.round(surface.width)}x${Math.round(surface.height)}:${Math.round(bounds.width)}:${motionAllowed()}`;
      phase.textContent = "校准进行中"; range.dataset.phase = "active";
      // HUD 只每 100ms 更新一次，不新增常驻 RAF。
      tick = setInterval(() => { if (!disposed && started !== null) clock.textContent = `${(elapsed() / 1000).toFixed(2)}s`; }, 100);
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
    if (!accepting || disposed || suspended || hits.length >= AIM_COUNT) return;
    countInput(e);
    misses++; setStats();
    const bounds = field.getBoundingClientRect(); impact(e.clientX - bounds.left, e.clientY - bounds.top, "miss");
    status(`${hits.length} / 6 节点 · 空击 ${misses} 次。目标中心的细点更精确。`);
  }, { signal });
  function clearWork() {
    clearInterval(tick); tick = undefined;
    timers.forEach(id => clearTimeout(id)); timers.clear();
    animations.forEach(animation => { animation.onfinish = null; animation.cancel(); }); animations.clear();
    field.querySelectorAll(".aim-impact").forEach(el => el.remove());
  }
  const action = (label: string, run: () => void) => {
    const b = node("button", "craft-button", label); b.type = "button";
    b.addEventListener("click", run, { signal }); actions.append(b); return b;
  };
  action("同题再试", () => {
    clearWork(); previous = completed; completed = null;
    hits.length = 0; misses = 0; started = null; pausedMs = 0; pausedAt = null; interrupted = false; inputs.clear();
    range.dataset.phase = "ready"; phase.textContent = "同题 · 等待首击"; clock.textContent = "0.00s";
    field.querySelector(".aim-results")?.remove();
    lamps.forEach(lamp => { delete lamp.dataset.hit; lamp.removeAttribute("title"); });
    positions = aimSequence(seed[0]); setStats(); drawTarget();
    status("已保留同一组目标。新的连续回合完成后，将与上一局同规格成绩比较。");
  });
  const share = action("复制挑战链接", () => {
    const link = new URL(location.href); link.searchParams.set("aim", String(seed[0])); link.hash = "islands";
    const manual = () => { shareLink.hidden = false; shareLink.value = link.href; shareLink.focus(); shareLink.select(); status("可选中下方链接后手动复制；同一链接会使用同种子目标。不同场地规格不比较成绩。"); };
    if (!navigator.clipboard?.writeText) { manual(); return; }
    navigator.clipboard.writeText(link.href).then(() => { if (!disposed) status("挑战链接已复制。同一种子，不同设备仍会按各自场地显示，不上传成绩。"); }).catch(() => { if (!disposed) manual(); });
  });
  share.title = `本轮种子 ${seed[0]} · 不上传成绩`;
  const shareLink = node("input", "aim-share-link"); shareLink.type = "text"; shareLink.readOnly = true;
  shareLink.hidden = true; shareLink.setAttribute("aria-label", "手动复制挑战链接"); actions.append(shareLink);
  const resize = new ResizeObserver(() => {
    const size = `${Math.round(field.clientWidth)}x${Math.round(field.clientHeight)}`;
    if (viewSize && size !== viewSize && started !== null && hits.length < AIM_COUNT) interrupted = true;
    viewSize = size;
  }); resize.observe(field);
  drawTarget();
  status("依次点亮六个信标，中心命中会留下冷金色印记。首击后计时；也支持 Tab / Enter。");
  const pause = () => {
    if (suspended) return;
    suspended = true; pausedAt = performance.now();
    if (started !== null && hits.length < AIM_COUNT) { interrupted = true; phase.textContent = "中断练习 · 已暂停"; }
    clearWork();
  };
  const resume = () => {
    if (!suspended) return;
    const gap = pausedAt === null ? 0 : performance.now() - pausedAt;
    if (started !== null) pausedMs += gap;
    shownAt += gap; pausedAt = null; suspended = false;
    if (hits.length < AIM_COUNT) {
      if (target.hidden) drawTarget();
      if (started !== null) {
        phase.textContent = "中断练习 · 继续";
        tick = setInterval(() => { clock.textContent = `${(elapsed() / 1000).toFixed(2)}s`; }, 100);
      }
    }
  };
  return session(() => { disposed = true; abort.abort(); clearWork(); resize.disconnect(); host.replaceChildren(); }, pause, resume, () => {
    if (started !== null && hits.length < AIM_COUNT) interrupted = true;
    animations.forEach(a => { a.onfinish = null; a.cancel(); }); animations.clear();
    field.querySelectorAll(".aim-impact").forEach(el => el.remove());
  });
}
