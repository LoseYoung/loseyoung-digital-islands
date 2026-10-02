import { runeTemplate, type Rune } from "./craft-model";
import { forestNotes, nextForest, recognizeGesture, type Forest, type Vec2 } from "./continuity-model";
import { motionAllowed } from "./runtime";
import { pointerSamples, session } from "./session";
import { lab, node, button, sketch, fitSheet, type CraftOptions } from "./craft-ui";

const spells = {
  moon: { name: "月环", glyph: "☾", color: "#dce9dd" },
  spark: { name: "星芒", glyph: "✧", color: "#e5c994" },
  breeze: { name: "微风", glyph: "≈", color: "#9bd7c6" },
};
export function mountCover(host: HTMLElement, options: CraftOptions) {
  const abort = new AbortController(), { signal } = abort;
  const { root, head } = lab(host, "FOREST GRIMOIRE / 02", "让上一次的光，回应下一道符文"); root.classList.add("rune-lab");
  const count = node("div", "craft-counter", "00 / 03"); count.setAttribute("aria-label", "已记录符文种类"); head.append(count);
  const chain = node("div", "rune-chain", "咒序 · 尚未书写"); root.append(chain);
  const stage = node("div", "rune-stage"), sheet = node("div", "rune-sheet"); stage.append(sheet); root.append(stage);
  const { canvas, ctx, point } = sketch(sheet, 900, 600, "rune-canvas"), unfit = fitSheet(stage, sheet, 1.5);
  const whisper = node("span", "rune-whisper", "圆环 · 折线 · 长弧"); stage.append(whisper);
  const journal = node("div", "rune-journal"); journal.setAttribute("aria-label", "符文记录与辅助施法"); root.append(journal);
  const foot = node("div", "craft-footnote rune-story", forestNotes.quiet); root.append(foot);
  const clear = button(root, "清空法阵", () => { stop(); forest = "quiet"; history = []; current = null; path = []; update(); guide(); options.status("法阵已清空，共鸣记录仍然保留。换个施法顺序试试。"); }, signal); clear.classList.add("rune-clear");
  const records = new Map<Rune, "drawn" | "assisted">(), buttons = new Map<Rune, HTMLButtonElement>();
  let path: Vec2[] = [], pointer: number | null = null, frame = 0, drawFrame = 0, current: Rune | null = null;
  let forest: Forest = "quiet", history: Rune[] = [], paused = false;
  const circle = (x: number, y: number, radius: number) => { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke(); };
  const scene = () => {
    ctx.lineWidth = 1; ctx.strokeStyle = "#86ab9130";
    for (let i = 0; i < 7; i++) {
      const x = 36 + i * 136;
      ctx.beginPath(); ctx.moveTo(x, 560); ctx.lineTo(x + 15, 130); ctx.moveTo(x + 8, 340); ctx.lineTo(x - 28, 240); ctx.moveTo(x + 11, 280); ctx.lineTo(x + 42, 190); ctx.stroke();
    }
    const lit = forest === "awakened";
    ctx.strokeStyle = lit ? "#e5d6a9" : "#8cac9430"; ctx.lineWidth = lit ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(710, 425); ctx.lineTo(710, 295); ctx.quadraticCurveTo(750, 240, 790, 295); ctx.lineTo(790, 425); ctx.stroke();
    if (lit) { const glow = ctx.createRadialGradient(750, 350, 2, 750, 350, 110); glow.addColorStop(0, "#e5d6a942"); glow.addColorStop(1, "#e5d6a900"); ctx.fillStyle = glow; ctx.fillRect(640, 240, 220, 220); }
    if (forest === "gathered" || forest === "carried" || forest === "awakened") {
      const x = forest === "gathered" ? 450 : 747, y = forest === "gathered" ? 285 : 342;
      for (let i = 0; i < 24; i++) { const a = i * 2.4, r = 13 + i % 5 * 7; ctx.fillStyle = i % 3 ? "#e4e8c5" : "#8dbba3"; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 1 + i % 3 * .5, 0, Math.PI * 2); ctx.fill(); }
    }
    if (forest === "constellation" || forest === "drifting") {
      const x = forest === "constellation" ? 450 : 615, y = forest === "constellation" ? 265 : 165;
      ctx.strokeStyle = "#dcc792a0"; ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = i / 5 * Math.PI * 2; ctx.lineTo(x + Math.cos(a) * 65, y + Math.sin(a) * 52); } ctx.stroke();
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ctx.fillStyle = "#ead8b0"; ctx.fillRect(x + Math.cos(a) * 65 - 2, y + Math.sin(a) * 52 - 2, 4, 4); }
    }
  };
  const guide = () => {
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.clearRect(0, 0, 900, 600); scene(); ctx.lineWidth = 1; ctx.strokeStyle = "#b3d3c225";
    circle(450, 290, 152); circle(450, 290, 170);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 3 ? 165 : 158; ctx.beginPath(); ctx.moveTo(450 + Math.cos(a) * r, 290 + Math.sin(a) * r); ctx.lineTo(450 + Math.cos(a) * 171, 290 + Math.sin(a) * 171); ctx.stroke(); }
  };
  const stroke = (alpha = 1, color = "#dce9dd") => {
    if (!path.length) return; ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length - 1; i++) ctx.quadraticCurveTo(path[i].x, path[i].y, (path[i].x + path[i + 1].x) / 2, (path[i].y + path[i + 1].y) / 2);
    const last = path[path.length - 1]; ctx.lineTo(last.x, last.y); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  };
  function update() {
    count.textContent = `${String(records.size).padStart(2, "0")} / 03`; root.dataset.forest = forest;
    chain.textContent = history.length ? `咒序 · ${history.map(v => spells[v].name).join(" → ")}` : "咒序 · 尚未书写";
    buttons.forEach((b, kind) => { b.dataset.discovered = String(records.has(kind)); b.dataset.current = String(current === kind); b.lastElementChild!.textContent = records.get(kind) === "drawn" ? "手绘共鸣" : records.has(kind) ? "辅助唤醒" : "尚待唤醒"; });
    foot.textContent = forestNotes[forest];
  }
  function stop() {
    cancelAnimationFrame(frame); cancelAnimationFrame(drawFrame); frame = drawFrame = 0;
    const id = pointer; pointer = null;
    if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  function cast(assisted = false) {
    const kind = recognizeGesture(path); stop();
    if (kind === "none") { guide(); stroke(.6); options.status("笔迹再舒展一些：闭合圆环、清晰折线或一条长弧。短点和复杂涂鸦不会强行识别。"); return; }
    current = kind; forest = nextForest(forest, kind); history = [...history, kind].slice(-3); root.dataset.rune = kind;
    if (!records.has(kind) || !assisted) records.set(kind, assisted ? "assisted" : "drawn"); update();
    whisper.textContent = `${spells[kind].glyph} ${spells[kind].name} / ${assisted ? "辅助施法" : "手绘共鸣"}`;
    options.status(`${spells[kind].name} · ${forestNotes[forest]} 已记录 ${records.size} / 3 种符文。`);
    const center = path.reduce((sum, p) => ({ x: sum.x + p.x / path.length, y: sum.y + p.y / path.length }), { x: 0, y: 0 }), start = performance.now();
    const render = (now: number) => {
      frame = 0; if (paused) return;
      const moving = motionAllowed(), t = moving ? Math.min(1, (now - start) / 1600) : 1;
      guide(); stroke(.35 + (1 - t) * .4, spells[kind].color);
      if (t < 1) for (let i = 0; i < 48; i++) {
        const origin = path[Math.min(path.length - 1, Math.floor(i / 48 * path.length))], a = i * 2.39996;
        let x = origin.x, y = origin.y;
        if (kind === "moon") { x = center.x + Math.cos(a + t * .6) * (85 + t * 125); y = center.y + Math.sin(a + t * .6) * (85 + t * 125); }
        else if (kind === "spark") { x += Math.cos(a) * t * (95 + i % 5 * 20); y += Math.sin(a) * t * (95 + i % 5 * 20); }
        else { x += t * 155 + Math.sin(a + t * 3) * 35; y -= t * 85; }
        ctx.globalAlpha = (1 - t) * .7; ctx.fillStyle = spells[kind].color; ctx.beginPath(); ctx.arc(x, y, 1.1 + i % 3 * .6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; if (moving && t < 1) frame = requestAnimationFrame(render);
    }; render(start);
  }
  (Object.keys(spells) as Rune[]).forEach(kind => {
    const b = button(journal, "", () => { if (!paused) { path = runeTemplate(kind); cast(true); } }, signal);
    b.className = "rune-token"; b.setAttribute("aria-label", `绘制${spells[kind].name}`);
    b.append(node("span", "rune-token-symbol", spells[kind].glyph), node("strong", "", spells[kind].name), node("span", "rune-token-state", "尚待唤醒")); buttons.set(kind, b);
  });
  const draw = () => { drawFrame = 0; guide(); stroke(); };
  const add = (e: PointerEvent) => {
    const p = point(e), last = path[path.length - 1];
    if (path.length < 600 && (!last || Math.hypot(p.x - last.x, p.y - last.y) > 2)) path.push(p);
  };
  canvas.addEventListener("pointerdown", e => { if (paused || !e.isPrimary || e.button !== 0) return; stop(); path = [point(e)]; pointer = e.pointerId; canvas.setPointerCapture(pointer); whisper.textContent = "正在书写 · 松手施法"; guide(); }, { signal });
  canvas.addEventListener("pointermove", e => { if (pointer !== e.pointerId || paused) return; pointerSamples(e).forEach(add); if (!drawFrame) drawFrame = requestAnimationFrame(draw); }, { signal });
  canvas.addEventListener("pointerup", e => { if (pointer === e.pointerId) { add(e); cast(); } }, { signal });
  canvas.addEventListener("pointercancel", () => { stop(); guide(); stroke(.5); }, { signal });
  canvas.addEventListener("lostpointercapture", () => { if (pointer !== null) { stop(); guide(); stroke(.5); } }, { signal });
  update(); guide(); options.status("先画月环聚起萤火，再用微风或星芒改变它。按钮与手绘遵守相同组合规则。");
  return session(() => { stop(); abort.abort(); unfit(); host.replaceChildren(); }, {
    pause: () => { stop(); paused = true; guide(); stroke(.35); },
    resume: () => { paused = false; guide(); stroke(.35); },
    motion: () => { if (!motionAllowed()) { stop(); guide(); stroke(.35); } },
  });
}
