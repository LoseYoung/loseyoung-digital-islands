import { Exposure } from "./craft-model";
import { lab, node, button, sketch, fitSheet, type CraftOptions } from "./craft-ui";
import { session } from "./session";

/** 仅使用仓库已经采用的摄影；底片清单可扩展，不伪称接入私人相册。 */
export function mountCover(host: HTMLElement, options: CraftOptions) {
  const abort = new AbortController(), { signal } = abort;
  const { root, head } = lab(host, "PHOTO STUDY / 01", "留下多少光，由你决定");
  root.classList.add("photo-lab");
  const meter = node("div", "photo-meter"), value = node("strong", "photo-percent", "00%");
  meter.append(value, node("span", "craft-small", "底片显影")); head.append(meter);
  const track = node("div", "photo-track"), fill = node("span", "photo-track-fill"); track.append(fill); root.append(track);
  const filmBar = node("div", "photo-films"); root.append(filmBar);
  const stage = node("div", "photo-stage"), sheet = node("div", "photo-sheet"); stage.append(sheet); root.append(stage);
  const image = node("img", "photo-print"); image.src = `${options.basePath}/moonlit-ocean-pramod-tiwari.jpg`;
  image.alt = "月夜海面底片"; image.draggable = false; sheet.append(image);
  const { canvas, ctx, point } = sketch(sheet, 900, 506.25, "photo-emulsion");
  const hint = node("div", "photo-gesture-hint"); hint.setAttribute("aria-hidden", "true");
  hint.append(node("span", "photo-hint-mark", "◌"), node("span", "", "不必填满，让暗处成为构图")); sheet.append(hint);
  const edge = node("span", "photo-edge", "01 / MOONLIT OCEAN"); edge.setAttribute("aria-hidden", "true"); stage.append(edge);
  const tools = node("div", "craft-tools"), brushes = node("div", "craft-toggle"), actions = node("div", "craft-actions");
  tools.append(brushes, actions); root.append(tools);
  const finishing = node("div", "craft-tools photo-finishing"); root.append(finishing);
  const caption = node("div", "photo-caption");
  caption.append(node("span", "", "PRAMOD TIWARI / 月夜摄影"), node("span", "photo-print-state", "未定影")); root.append(caption);
  root.append(node("div", "craft-footnote", "可随时定影；只保存在本次页面访问中。内置月夜摄影；可加入三张自选底片，只在浏览器处理，不上传到服务器。"));
  const exposure = new Exposure();
  let radius = 58, pointer: number | null = null, last = { x: 0, y: 0 }, complete = false, suspended = false;
  let frame = 0, disposed = false, filmIndex = 0;
  const objectUrls: string[] = [];
  type Film = { url: string; title: string; mask: ImageData | null; cells: Uint8Array | null; complete: boolean; tone: string };
  const films: Film[] = [{ url: image.src, title: "月夜摄影", mask: null, cells: null, complete: false, tone: "color" }];
  type Sample = { x: number; y: number; pressure: number };
  let queue: Sample[] = [];
  // 最多四次撤销，约 7MB；切换/收起保留，重来释放，不保存到浏览器磁盘。
  const undoStack: { mask: ImageData; cells: Uint8Array; complete: boolean }[] = [];
  const unfit = fitSheet(stage, sheet, 16 / 9);
  const brush = document.createElement("canvas"); brush.width = brush.height = 128;
  const brushContext = brush.getContext("2d")!;
  const glow = brushContext.createRadialGradient(64, 64, 35, 64, 64, 64); glow.addColorStop(0, "#000"); glow.addColorStop(1, "#0000");
  brushContext.fillStyle = glow; brushContext.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#070e16"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const update = () => {
    const percent = exposure.percent;
    value.textContent = `${String(percent).padStart(2, "0")}%`; fill.style.width = `${percent}%`; root.dataset.exposure = String(percent);
    root.dataset.complete = String(complete); canvas.style.cursor = complete ? "default" : "crosshair";
    caption.lastElementChild!.textContent = complete ? `已定影 · ${percent}% 的光，也是完整作品` : "未定影";
    undo.disabled = undoStack.length === 0;
    fix.textContent = complete ? "继续用光作画" : "就这样定影";
  };
  const checkpoint = () => {
    undoStack.push({ mask: ctx.getImageData(0, 0, canvas.width, canvas.height), cells: exposure.cells.slice(), complete });
    if (undoStack.length > 4) undoStack.shift();
  };
  const erase = (next: Sample) => {
    const r = radius * next.pressure, a = last;
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000"; ctx.lineWidth = r * 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(next.x, next.y); ctx.stroke();
    const count = Math.min(150, Math.ceil(Math.hypot(next.x - a.x, next.y - a.y) / Math.max(r * .3, 1)) + 1);
    for (let i = 0; i <= count; i++) {
      const x = a.x + (next.x - a.x) * i / count, y = a.y + (next.y - a.y) * i / count;
      ctx.drawImage(brush, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    exposure.paint(a, next, r); last = next;
  };
  const flush = () => { cancelAnimationFrame(frame); frame = 0; queue.forEach(erase); queue = []; update(); };
  const endStroke = () => {
    flush();
    if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    pointer = null;
  };
  const finishPrint = () => {
    endStroke(); checkpoint(); ctx.clearRect(0, 0, canvas.width, canvas.height); exposure.fill(); complete = true; hint.hidden = true; update();
    options.status("整幅月夜已显影。可以撤销到刚才的构图，或切换银盐影调。");
  };
  let fine: HTMLButtonElement, soft: HTMLButtonElement;
  const selectBrush = (size: number) => { endStroke(); radius = size; fine.setAttribute("aria-pressed", String(size === 25)); soft.setAttribute("aria-pressed", String(size === 58)); };
  fine = button(brushes, "细笔", () => selectBrush(25), signal);
  soft = button(brushes, "柔光", () => selectBrush(58), signal);
  const tone = button(actions, "银盐影调", () => { const on = root.dataset.tone !== "silver"; root.dataset.tone = on ? "silver" : "color"; tone.setAttribute("aria-pressed", String(on)); }, signal);
  tone.setAttribute("aria-pressed", "false");
  const undo = button(finishing, "撤销一笔", () => {
    endStroke(); const previous = undoStack.pop(); if (!previous) return;
    ctx.putImageData(previous.mask, 0, 0); exposure.cells.set(previous.cells); complete = previous.complete;
    hint.hidden = exposure.percent > 0; update(); options.status(`已撤销。保留 ${exposure.percent}% 的光，可以继续构图。`);
  }, signal);
  const fix = button(finishing, "就这样定影", () => {
    endStroke(); complete = !complete; hint.hidden = true; update();
    options.status(complete ? `作品已定影，保留 ${exposure.percent}% 的光。暗处不会自动被填满。` : "相纸已重新打开，继续留下你的光。");
  }, signal);
  button(actions, "显影整幅", finishPrint, signal);
  selectBrush(58);
  const select = node("select", "photo-film-select"); select.setAttribute("aria-label", "选择底片");
  const first = node("option", "", "01 · 月夜摄影"); first.value = "0"; select.append(first); filmBar.append(select);
  const input = node("input", "photo-film-input"); input.type = "file"; input.accept = "image/jpeg,image/png,image/webp";
  input.hidden = true; input.setAttribute("aria-label", "添加自选底片"); filmBar.append(input);
  const add = button(filmBar, "自选底片 · 不上传", () => input.click(), signal);
  const switchFilm = (to: number) => {
    if (!films[to] || to === filmIndex) return;
    endStroke();
    const old = films[filmIndex]; old.mask = ctx.getImageData(0, 0, canvas.width, canvas.height); old.cells = exposure.cells.slice(); old.complete = complete; old.tone = root.dataset.tone || "color";
    undoStack.length = 0; filmIndex = to; const film = films[to]; image.src = film.url; image.alt = film.title;
    ctx.globalCompositeOperation = "source-over";
    if (film.mask) ctx.putImageData(film.mask, 0, 0); else { ctx.fillStyle = "#070e16"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    exposure.cells.fill(0); if (film.cells) exposure.cells.set(film.cells);
    complete = film.complete; hint.hidden = complete || exposure.percent > 0;
    root.dataset.tone = film.tone; tone.setAttribute("aria-pressed", String(film.tone === "silver"));
    caption.firstElementChild!.textContent = to === 0 ? "PRAMOD TIWARI / 月夜摄影" : "自选底片 / 仅本次访问";
    edge.textContent = `${String(to + 1).padStart(2, "0")} / ${to === 0 ? "MOONLIT OCEAN" : "YOUR FRAME"}`;
    select.value = String(to); update(); options.status("已切换底片。各张画面分别保留，撤销历史仅保留当前底片的最近四笔。");
  };
  select.addEventListener("change", () => switchFilm(Number(select.value)), { signal });
  input.addEventListener("change", async () => {
    const file = input.files?.[0]; input.value = "";
    if (!file || films.length >= 4) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) { options.status("请选择 12MB 以内的 JPG、PNG 或 WebP。文件不会上传。"); return; }
    add.disabled = true; options.status("正在浏览器中准备底片，不会上传……");
    let temporaryURL: string | null = null;
    try {
      temporaryURL = URL.createObjectURL(file);
      const source = new Image(); source.src = temporaryURL; await source.decode();
      if (disposed) return;
      if (source.naturalWidth * source.naturalHeight > 24000000) throw new Error("底片尺寸过大");
      const scale = Math.min(1, 1600 / Math.max(source.naturalWidth, source.naturalHeight));
      const local = document.createElement("canvas"); local.width = Math.max(1, Math.round(source.naturalWidth * scale)); local.height = Math.max(1, Math.round(source.naturalHeight * scale));
      local.getContext("2d")!.drawImage(source, 0, 0, local.width, local.height);
      const blob = await new Promise<Blob | null>(resolve => local.toBlob(resolve, "image/jpeg", .88));
      if (!blob || disposed) return;
      const url = URL.createObjectURL(blob); objectUrls.push(url);
      const index = films.length; films.push({ url, title: `自选底片 ${index}`, mask: null, cells: null, complete: false, tone: "color" });
      const option = node("option", "", `${String(index + 1).padStart(2, "0")} · 自选底片`); option.value = String(index); select.append(option); switchFilm(index);
    } catch { if (!disposed) options.status("这张图片暂时无法解码。请换一张 JPG、PNG 或 WebP；原底片仍在。"); }
    finally { if (temporaryURL) URL.revokeObjectURL(temporaryURL); if (!disposed) add.disabled = films.length >= 4; }
  }, { signal });
  const sample = (event: PointerEvent): Sample => ({ ...point(event), pressure: event.pointerType === "pen" ? Math.max(.5, Math.min(1.4, event.pressure * 1.4)) : 1 });
  canvas.addEventListener("pointerdown", e => {
    if (!e.isPrimary || e.button !== 0 || complete || suspended) return;
    endStroke(); checkpoint(); pointer = e.pointerId; last = point(e); canvas.setPointerCapture(pointer); hint.hidden = true;
    queue.push(sample(e)); flush();
  }, { signal });
  canvas.addEventListener("pointermove", e => {
    if (pointer !== e.pointerId || suspended) return;
    const points = e.getCoalescedEvents?.();
    for (const entry of points?.length ? points : [e]) { queue.push(sample(entry)); if (queue.length >= 256) flush(); }
    if (!frame) frame = requestAnimationFrame(flush);
  }, { signal });
  canvas.addEventListener("pointerup", e => {
    if (pointer !== e.pointerId) return; queue.push(sample(e)); endStroke();
    options.status(`已显影约 ${exposure.percent}% · 可以继续画、撤销一笔，或就这样定影。`);
  }, { signal });
  canvas.addEventListener("pointercancel", endStroke, { signal });
  canvas.addEventListener("lostpointercapture", () => { if (pointer !== null) { pointer = null; flush(); } }, { signal });
  image.addEventListener("error", () => options.status("底片暂时加载失败。正式照片岛入口仍可使用。"), { signal });
  update(); options.status("按住划过底片。不到 100% 也可以定影；撤销最多保留四笔，进度为覆盖估算。");
  return session(() => { disposed = true; endStroke(); abort.abort(); undoStack.length = 0; films.length = 0; objectUrls.forEach(url => URL.revokeObjectURL(url)); unfit(); host.replaceChildren(); },
    () => { endStroke(); suspended = true; }, () => { suspended = false; }, () => { endStroke(); });
}
