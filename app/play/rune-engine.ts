import { recognizeRune, type Point } from "./physics";
import { runeTemplate, type Rune } from "./craft-model";
import { motionAllowed } from "./runtime";
import { lab, node, button, sketch, fitSheet, type CraftOptions } from "./craft-ui";

const spells = {
  moon: { name: "月环", glyph: "☾", color: "#dce9dd", note: "月环闭合，林间的萤火向光靠拢。" },
  spark: { name: "星芒", glyph: "✧", color: "#e5c994", note: "折线里的星火，沿着枝梢散开。" },
  breeze: { name: "微风", glyph: "≈", color: "#9bd7c6", note: "风穿过笔迹，把碎光带向林间。" },
};

export function mountCover(host: HTMLElement, options: CraftOptions) {
  const abort = new AbortController(), { signal } = abort;
  const { root, head } = lab(host, "FOREST GRIMOIRE / 02", "在林间，写下一道光"); root.classList.add("rune-lab");
  const count = node("div", "craft-counter", "00 / 03"); count.setAttribute("aria-label", "已记录符文种类"); head.append(count);
  const stage = node("div", "rune-stage"), sheet = node("div", "rune-sheet"); stage.append(sheet); root.append(stage);
  const { canvas, ctx, point } = sketch(sheet, 900, 600, "rune-canvas");
  const unfit = fitSheet(stage, sheet, 1.5);
  const whisper = node("span", "rune-whisper", "圆环 · 折线 · 长弧"); stage.append(whisper);
  const journal = node("div", "rune-journal"); journal.setAttribute("aria-label", "符文记录与辅助施法"); root.append(journal);
  const foot = node("div", "craft-footnote", "直接描画以探索 · 下方按钮可辅助施法"); root.append(foot);
  const records = new Map<Rune, "drawn" | "assisted">(), buttons = new Map<Rune, HTMLButtonElement>();
  let path: Point[] = [], pointer: number | null = null, frame = 0, current: Rune | null = null;
  const circle = (x: number, y: number, radius: number) => { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke(); };
  const guide = () => {
    ctx.clearRect(0, 0, 900, 600); ctx.lineWidth = 1; ctx.strokeStyle = "#b3d3c22a";
    circle(450, 290, 152); circle(450, 290, 170);
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, r = i % 3 ? 165 : 158;
      ctx.beginPath(); ctx.moveTo(450 + Math.cos(a) * r, 290 + Math.sin(a) * r);
      ctx.lineTo(450 + Math.cos(a) * 171, 290 + Math.sin(a) * 171); ctx.stroke();
    }
    ctx.fillStyle = "#c4d8c647";
    [[450, 97], [450, 483], [257, 290], [643, 290]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); });
  };
  const stroke = (alpha = 1, color = "#dce9dd") => {
    if (!path.length) return; ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length - 1; i++) ctx.quadraticCurveTo(path[i].x, path[i].y, (path[i].x + path[i + 1].x) / 2, (path[i].y + path[i + 1].y) / 2);
    const last = path.at(-1)!; ctx.lineTo(last.x, last.y); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  };
  const updateJournal = () => {
    count.textContent = `${String(records.size).padStart(2, "0")} / 03`;
    buttons.forEach((b, kind) => { b.dataset.discovered = String(records.has(kind)); b.dataset.current = String(current === kind); b.lastElementChild!.textContent = records.get(kind) === "drawn" ? "手绘共鸣" : records.has(kind) ? "辅助唤醒" : "尚待唤醒"; });
    if (records.size === 3) foot.textContent = "三种共鸣已记录 · 再画一次，让森林回应";
  };
  const cast = (assisted = false) => {
    const kind = recognizeRune(path); cancelAnimationFrame(frame);
    if (kind === "none") { guide(); stroke(.6); options.status("笔迹再舒展一些。试着闭合圆环、画一道折线，或留下一条长弧。"); return; }
    current = kind; root.dataset.rune = kind;
    if (!records.has(kind) || !assisted) records.set(kind, assisted ? "assisted" : "drawn"); updateJournal();
    whisper.textContent = `${spells[kind].glyph}  ${spells[kind].name} / ${assisted ? "辅助施法" : "手绘共鸣"}`;
    options.status(`${spells[kind].note}${records.size === 3 ? "三种符文都已留下回应。" : `已记录 ${records.size} / 3 种符文。`}`);
    const center = path.reduce((sum, p) => ({ x: sum.x + p.x / path.length, y: sum.y + p.y / path.length }), { x: 0, y: 0 });
    const start = performance.now();
    const render = (now: number) => {
      const moving = motionAllowed(), t = moving ? Math.min(1, (now - start) / 1900) : .36;
      guide(); stroke(.8 - t * .45, spells[kind].color);
      ctx.strokeStyle = spells[kind].color; ctx.lineWidth = 1.4; ctx.globalAlpha = (1 - t) * .8;
      if (kind === "moon") { circle(center.x, center.y, 104 + t * 112); circle(center.x, center.y, 112 + t * 133); }
      if (kind === "spark") {
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(center.x + Math.cos(a) * (20 + t * 95), center.y + Math.sin(a) * (20 + t * 95)); ctx.lineTo(center.x + Math.cos(a) * (55 + t * 170), center.y + Math.sin(a) * (55 + t * 170)); ctx.stroke(); }
      }
      for (let i = 0; i < 56; i++) {
        const origin = path[Math.min(path.length - 1, Math.floor(i / 56 * path.length))], a = i * 2.39996;
        let x = origin.x, y = origin.y;
        if (kind === "moon") { const r = 85 + t * 145 + Math.sin(i * 3) * 16; x = center.x + Math.cos(a + t * .6) * r; y = center.y + Math.sin(a + t * .6) * r; }
        else if (kind === "spark") { x += Math.cos(a) * t * (110 + i % 5 * 24); y += Math.sin(a) * t * (110 + i % 5 * 24); }
        else { x += t * 115 + Math.sin(a + t * 3) * 40; y -= t * 110 + Math.sin(t * 4 + a) * 20; }
        ctx.globalAlpha = Math.max(0, 1 - t) * (.4 + (i % 4) * .18); ctx.fillStyle = i % 5 ? spells[kind].color : "#f0d5a2";
        ctx.beginPath(); ctx.arc(x, y, 1.1 + i % 3 * .6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (moving && t < 1) frame = requestAnimationFrame(render); else frame = 0;
    }; render(start);
  };
  (Object.keys(spells) as Rune[]).forEach(kind => {
    const b = button(journal, "", () => { path = runeTemplate(kind); cast(true); }, signal);
    b.className = "rune-token"; b.setAttribute("aria-label", `绘制${spells[kind].name}`);
    b.append(node("span", "rune-token-symbol", spells[kind].glyph), node("strong", "", spells[kind].name), node("span", "rune-token-state", "尚待唤醒")); buttons.set(kind, b);
  });
  canvas.addEventListener("pointerdown", e => {
    if (!e.isPrimary || e.button !== 0) return; cancelAnimationFrame(frame); frame = 0;
    path = [point(e)]; pointer = e.pointerId; canvas.setPointerCapture(pointer); whisper.textContent = "正在书写 · 松手施法"; guide();
  }, { signal });
  canvas.addEventListener("pointermove", e => {
    if (pointer !== e.pointerId) return;
    const p = point(e), last = path.at(-1)!;
    if (path.length < 420 && Math.hypot(p.x - last.x, p.y - last.y) > 3) { path.push(p); guide(); stroke(); }
  }, { signal });
  canvas.addEventListener("pointerup", e => {
    if (pointer !== e.pointerId) return; pointer = null;
    if (path.length < 421) path.push(point(e)); cast();
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  }, { signal });
  const cancel = () => { if (pointer !== null) { pointer = null; guide(); whisper.textContent = "笔迹已放下 · 可以重新描画"; } };
  canvas.addEventListener("pointercancel", cancel, { signal }); canvas.addEventListener("lostpointercapture", cancel, { signal });
  guide(); options.status("描画圆环、折线或长弧，松手唤醒不同的光。三个按钮可辅助施法，不要求必须绘画。");
  return () => { abort.abort(); cancelAnimationFrame(frame); unfit(); host.replaceChildren(); };
}
