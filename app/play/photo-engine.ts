import { Exposure } from "./craft-model";
import { lab, node, button, sketch, fitSheet, type CraftOptions } from "./craft-ui";
import { pointerSamples, session } from "./session";

type BrushPoint = { x: number; y: number; r: number };
type PrintState = { strokes: BrushPoint[][]; full: boolean; fixed: boolean; silver: boolean };
// 三张构图练习来自同一授权月夜原片，不冒充已接入用户相册。
const negatives = [
  { name: "全景", code: "01 / MOONLIT OCEAN", crop: [0, 0, 1, 1] },
  { name: "远岸", code: "02 / A CLOSER SHORE", crop: [.32, .32, .64, .64] },
  { name: "水光", code: "03 / WATER STUDY", crop: [.46, .49, .42, .42] },
] as const;

export function mountCover(host: HTMLElement, options: CraftOptions) {
  const abort = new AbortController(), { signal } = abort;
  const { root, head } = lab(host, "PHOTO STUDY / 01", "留下你想留下的那一束光"); root.classList.add("photo-lab");
  const meter = node("div", "photo-meter"), value = node("strong", "photo-percent", "00%");
  meter.append(value, node("span", "craft-small", "覆盖估算")); head.append(meter);
  const strip = node("div", "photo-negatives"); strip.setAttribute("aria-label", "同一原片的三种取景练习"); root.append(strip);
  const track = node("div", "photo-track"), fill = node("span", "photo-track-fill"); track.append(fill); root.append(track);
  const stage = node("div", "photo-stage"), sheet = node("div", "photo-sheet"); stage.append(sheet); root.append(stage);
  const image = node("img", "photo-print"); image.src = `${options.basePath}/moonlit-ocean-pramod-tiwari.jpg`; image.alt = "月夜海面取景底片"; image.draggable = false; sheet.append(image);
  const { canvas, ctx, point } = sketch(sheet, 900, 506.25, "photo-emulsion");
  const hint = node("div", "photo-gesture-hint"); hint.setAttribute("aria-hidden", "true");
  hint.append(node("span", "photo-hint-mark", "◌"), node("span", "", "不必显出整幅，留下你自己的构图")); sheet.append(hint);
  const edge = node("span", "photo-edge"); stage.append(edge);
  const tools = node("div", "craft-tools"), brushes = node("div", "craft-toggle"), actions = node("div", "craft-actions");
  tools.append(brushes, actions); root.append(tools);
  const finishing = node("div", "photo-finishing"); root.append(finishing);
  const caption = node("div", "photo-caption"); caption.append(node("span", "", "PRAMOD TIWARI / 同一原片取景练习"), node("span", "photo-print-state", "未定影")); root.append(caption);
  const states: PrintState[] = negatives.map(() => ({ strokes: [], full: false, fixed: false, silver: false }));
  let selected = 0, radius = 58, pointer: number | null = null, stroke: BrushPoint[] | null = null, frame = 0, paused = false, disposed = false;
  let exposure = new Exposure(), pending: BrushPoint[] = [], last: BrushPoint | null = null;
  const unfit = fitSheet(stage, sheet, 16 / 9);
  const current = () => states[selected];
  const selectButtons: HTMLButtonElement[] = [];
  const mask = () => {
    ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#070e16"; ctx.fillRect(0, 0, 900, 507);
    const grain = ctx.createLinearGradient(0, 0, 900, 506); grain.addColorStop(0, "#23343a60"); grain.addColorStop(1, "#050d1300");
    ctx.fillStyle = grain; ctx.fillRect(0, 0, 900, 507);
    for (let i = 0; i < 160; i++) { ctx.fillStyle = "#d7dfcf10"; ctx.fillRect((i * 137) % 900, (i * 83) % 506, 1, 1); }
  };
  const segment = (a: BrushPoint, b: BrushPoint) => {
    const r = (a.r + b.r) / 2;
    ctx.globalCompositeOperation = "destination-out"; ctx.strokeStyle = "#000"; ctx.lineWidth = r * 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    const count = Math.min(100, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(r * .3, 1)) + 1);
    for (let i = 0; i <= count; i++) {
      const x = a.x + (b.x - a.x) * i / count, y = a.y + (b.y - a.y) * i / count;
      const glow = ctx.createRadialGradient(x, y, r * .55, x, y, r); glow.addColorStop(0, "#000"); glow.addColorStop(1, "#0000");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over"; exposure.paint(a, b, r);
  };
  const update = () => {
    const state = current(); value.textContent = `${String(exposure.percent).padStart(2, "0")}%`; fill.style.width = `${exposure.percent}%`;
    root.dataset.exposure = String(exposure.percent); root.dataset.complete = String(state.fixed); root.dataset.tone = state.silver ? "silver" : "color";
    hint.hidden = state.full || state.strokes.length > 0; caption.lastElementChild!.textContent = state.fixed ? "已定影 · 留白也是画面" : "未定影";
    fix.textContent = state.fixed ? "继续绘制" : "定影"; undo.disabled = state.fixed || !state.strokes.length; save.disabled = !state.fixed;
    tone.setAttribute("aria-pressed", String(state.silver)); selectButtons.forEach((b, i) => b.setAttribute("aria-pressed", String(selected === i)));
  };
  const redraw = () => {
    mask(); exposure = new Exposure(); const state = current();
    if (state.full) { ctx.clearRect(0, 0, 900, 507); exposure.fill(); }
    else state.strokes.forEach(points => points.forEach((p, i) => segment(i ? points[i - 1] : p, p)));
    const [x, y, w, h] = negatives[selected].crop;
    image.style.width = `${100 / w}%`; image.style.height = `${100 / h}%`; image.style.left = `${-x / w * 100}%`; image.style.top = `${-y / h * 100}%`;
    edge.textContent = negatives[selected].code; update();
  };
  const flush = () => {
    cancelAnimationFrame(frame); frame = 0;
    for (const p of pending) { segment(last ?? p, p); last = p; }
    pending = []; update();
  };
  const endStroke = () => {
    flush(); const id = pointer; pointer = null; stroke = null; last = null;
    if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
  negatives.forEach((negative, i) => selectButtons.push(button(strip, negative.name, () => { endStroke(); selected = i; redraw(); options.status("已切换取景，本页内的其他底片笔迹仍保留。三种取景来自同一张摄影。"); }, signal)));
  let fine: HTMLButtonElement, soft: HTMLButtonElement;
  const selectBrush = (size: number) => { radius = size; fine.setAttribute("aria-pressed", String(size === 25)); soft.setAttribute("aria-pressed", String(size === 58)); };
  fine = button(brushes, "细笔", () => selectBrush(25), signal); soft = button(brushes, "柔光", () => selectBrush(58), signal); selectBrush(58);
  const undo = button(actions, "撤销一笔", () => { endStroke(); current().strokes.pop(); redraw(); options.status("已撤销最后一笔。你留下的空白同样属于画面。"); }, signal);
  const tone = button(actions, "银盐影调", () => { current().silver = !current().silver; update(); }, signal);
  const fix = button(finishing, "定影", () => {
    endStroke(); current().fixed = !current().fixed; update();
    options.status(current().fixed ? "这一束光已定影，未显出的暗部不会被自动擦掉。可以保存作品，或继续绘制。" : "相纸重新回到手中，继续显影或撤销一笔。");
  }, signal);
  button(finishing, "显影整幅", () => { endStroke(); current().full = true; current().fixed = true; redraw(); options.status("整幅月夜已显影。可以定影保存，或点击重来重新构图。"); }, signal);
  const save = button(finishing, "保存作品", async () => {
    if (!current().fixed || disposed) return;
    const snapshot = { selected, silver: current().silver };
    try {
      await image.decode(); if (disposed || selected !== snapshot.selected) return;
      const output = document.createElement("canvas"); output.width = 1200; output.height = 780;
      const paint = output.getContext("2d"); if (!paint) throw new Error("无法生成相纸");
      paint.fillStyle = "#10191d"; paint.fillRect(0, 0, 1200, 780);
      const [x, y, w, h] = negatives[selected].crop;
      paint.filter = snapshot.silver ? "grayscale(1) sepia(.12) contrast(1.05)" : "none";
      paint.drawImage(image, image.naturalWidth * x, image.naturalHeight * y, image.naturalWidth * w, image.naturalHeight * h, 36, 36, 1128, 634.5);
      paint.filter = "none"; paint.drawImage(canvas, 36, 36, 1128, 634.5);
      paint.strokeStyle = "#75807a"; paint.strokeRect(35.5, 35.5, 1129, 635.5);
      paint.fillStyle = "#d9d8c4"; paint.font = "18px Georgia"; paint.fillText("A little light, left by you.", 36, 711);
      paint.fillStyle = "#97aaa7"; paint.font = "12px sans-serif"; paint.fillText("DIGITAL ISLANDS / Photo: Pramod Tiwari / Your light study", 36, 741);
      output.toBlob(blob => {
        if (!blob || disposed) return;
        const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `digital-islands-light-study-${selected + 1}.png`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000); options.status("作品已在浏览器中生成，未上传你的笔迹。");
      }, "image/png");
    } catch { if (!disposed) options.status("图片暂时无法导出，请确认底片已加载后重试。"); }
  }, signal);
  const add = (event: PointerEvent) => {
    if (!stroke || stroke.length >= 600) return;
    const p = point(event), r = radius * (event.pointerType === "pen" ? Math.max(.5, Math.min(1.4, event.pressure * 1.4)) : 1);
    const previous = stroke.at(-1); if (previous && Math.hypot(p.x - previous.x, p.y - previous.y) < 2) return;
    const sample = { ...p, r }; stroke.push(sample); pending.push(sample);
    if (!frame) frame = requestAnimationFrame(flush);
  };
  canvas.addEventListener("pointerdown", e => {
    if (paused || !e.isPrimary || e.button !== 0 || current().fixed || current().full) return;
    if (current().strokes.length >= 100) { options.status("本张练习最多保留 100 笔，请定影保存或撤销后继续。"); return; }
    pointer = e.pointerId; stroke = []; current().strokes.push(stroke); last = null; canvas.setPointerCapture(pointer); add(e);
  }, { signal });
  canvas.addEventListener("pointermove", e => { if (pointer === e.pointerId && !paused) pointerSamples(e).forEach(add); }, { signal });
  canvas.addEventListener("pointerup", e => { if (pointer !== e.pointerId) return; add(e); endStroke(); options.status(`已显影约 ${exposure.percent}% · 可以继续，也可以现在定影，保留暗处。`); }, { signal });
  canvas.addEventListener("pointercancel", endStroke, { signal }); canvas.addEventListener("lostpointercapture", () => { if (pointer !== null) endStroke(); }, { signal });
  image.addEventListener("error", () => { if (!disposed) options.status("底片暂时加载失败，请收起后重试。照片岛入口仍可使用。"); }, { signal });
  redraw(); options.status("按住划过底片，用光构图。定影不会补全暗部；本页保留笔迹，可撤销、换取景与保存。");
  return session(() => { disposed = true; endStroke(); abort.abort(); unfit(); host.replaceChildren(); }, {
    pause: () => { endStroke(); paused = true; }, resume: () => { paused = false; }, motion: () => { endStroke(); },
  });
}
