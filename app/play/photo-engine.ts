import { Exposure } from "./craft-model";
import { lab, node, button, sketch, fitSheet, type CraftOptions } from "./craft-ui";

/** 暗房：底片、柔边光刷、覆盖估算与影调。空闲无绘图循环。 */
export function mountCover(host: HTMLElement, options: CraftOptions) {
  const abort = new AbortController(), { signal } = abort;
  const { root, head } = lab(host, "PHOTO STUDY / 01", "把月光，慢慢显出来");
  root.classList.add("photo-lab");
  const meter = node("div", "photo-meter"), value = node("strong", "photo-percent", "00%");
  meter.append(value, node("span", "craft-small", "底片显影")); head.append(meter);
  const track = node("div", "photo-track"), fill = node("span", "photo-track-fill"); track.append(fill); root.append(track);
  const stage = node("div", "photo-stage"), sheet = node("div", "photo-sheet"); stage.append(sheet); root.append(stage);
  const image = node("img", "photo-print"); image.src = `${options.basePath}/moonlit-ocean-pramod-tiwari.jpg`;
  image.alt = "月夜海面底片"; image.draggable = false; sheet.append(image);
  const { canvas, ctx, point } = sketch(sheet, 900, 506.25, "photo-emulsion");
  ctx.fillStyle = "#070e16"; ctx.fillRect(0, 0, 900, 507);
  const grain = ctx.createLinearGradient(0, 0, 900, 506); grain.addColorStop(0, "#23343a60"); grain.addColorStop(1, "#050d1300");
  ctx.fillStyle = grain; ctx.fillRect(0, 0, 900, 507);
  for (let i = 0; i < 160; i++) { ctx.fillStyle = "#d7dfcf10"; ctx.fillRect((i * 137) % 900, (i * 83) % 506, 1, 1); }
  const hint = node("div", "photo-gesture-hint"); hint.setAttribute("aria-hidden", "true");
  hint.append(node("span", "photo-hint-mark", "◌"), node("span", "", "划过暗处，留下一束光")); sheet.append(hint);
  const edge = node("span", "photo-edge", "01 / MOONLIT OCEAN"); edge.setAttribute("aria-hidden", "true"); stage.append(edge);
  const tools = node("div", "craft-tools"), brushes = node("div", "craft-toggle"), actions = node("div", "craft-actions");
  tools.append(brushes, actions); root.append(tools);
  const caption = node("div", "photo-caption");
  caption.append(node("span", "", "PRAMOD TIWARI / 月夜摄影"), node("span", "photo-print-state", "未定影")); root.append(caption);
  const exposure = new Exposure(); let radius = 58, pointer: number | null = null, last = { x: 0, y: 0 }, disposed = false, complete = false;
  const unfit = fitSheet(stage, sheet, 16 / 9);
  const update = () => { value.textContent = `${String(exposure.percent).padStart(2, "0")}%`; fill.style.width = `${exposure.percent}%`; root.dataset.exposure = String(exposure.percent); };
  const finishPrint = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); exposure.fill(); complete = true; hint.hidden = true; root.dataset.complete = "true";
    caption.lastElementChild!.textContent = "已定影 · 这一束光，留住了"; update();
    options.status("整幅月夜已显影。可切换原色与银盐影调，或点“重来”重新用光作画。");
  };
  let fine: HTMLButtonElement, soft: HTMLButtonElement;
  const selectBrush = (size: number) => { radius = size; fine.setAttribute("aria-pressed", String(size === 25)); soft.setAttribute("aria-pressed", String(size === 58)); };
  fine = button(brushes, "细笔", () => selectBrush(25), signal);
  soft = button(brushes, "柔光", () => selectBrush(58), signal); selectBrush(58);
  fine.title = "较细的显影笔"; soft.title = "较宽的柔边光刷";
  const tone = button(actions, "银盐影调", () => { const on = root.dataset.tone !== "silver"; root.dataset.tone = on ? "silver" : "color"; tone.setAttribute("aria-pressed", String(on)); }, signal);
  tone.setAttribute("aria-pressed", "false"); button(actions, "显影整幅", finishPrint, signal);
  const erase = (a: { x: number; y: number }, b: { x: number; y: number }, pressure: number) => {
    if (complete) return;
    hint.hidden = true; const r = radius * pressure;
    ctx.globalCompositeOperation = "destination-out";
    // 先做连续实芯，再叠加柔边，避免快速划动留下断点。
    ctx.strokeStyle = "#000"; ctx.lineWidth = r * 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    const count = Math.min(150, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(r * .3, 1)) + 1);
    for (let i = 0; i <= count; i++) {
      const x = a.x + (b.x - a.x) * i / count, y = a.y + (b.y - a.y) * i / count;
      const glow = ctx.createRadialGradient(x, y, r * .55, x, y, r); glow.addColorStop(0, "#000"); glow.addColorStop(1, "#0000");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over"; exposure.paint(a, b, r); update();
    if (exposure.percent >= 94) finishPrint();
  };
  const pressure = (e: PointerEvent) => e.pointerType === "pen" ? Math.max(.5, Math.min(1.4, e.pressure * 1.4)) : 1;
  canvas.addEventListener("pointerdown", e => { if (!e.isPrimary || e.button !== 0 || complete) return; pointer = e.pointerId; last = point(e); canvas.setPointerCapture(pointer); erase(last, last, pressure(e)); }, { signal });
  canvas.addEventListener("pointermove", e => { if (pointer !== e.pointerId) return; const p = point(e); erase(last, p, pressure(e)); last = p; }, { signal });
  const end = (e: PointerEvent) => {
    if (pointer !== e.pointerId) return; pointer = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (!complete) options.status(`已显影约 ${exposure.percent}% · 细笔留下线条，柔光展开更宽的月色。`);
  };
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(name => canvas.addEventListener(name, end as EventListener, { signal }));
  image.addEventListener("error", () => { if (!disposed) options.status("底片暂时加载失败，请收起后重试。正式照片岛入口仍可使用。"); }, { signal });
  update(); options.status("按住划过底片，用光慢慢显影。也可直接显影整幅；进度为网格覆盖估算。");
  return () => { disposed = true; abort.abort(); unfit(); host.replaceChildren(); };
}
