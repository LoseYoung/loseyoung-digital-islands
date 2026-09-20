import { clamp, moveStop, recognizeRune, type Point } from "./physics";
import { makeCanvas, control, motionAllowed, type Dispose } from "./runtime";

type Options = { kind: string; basePath: string; status: (message: string) => void };

/** 只在点击“试一下”后加载。每个实验只拥有 host 内的节点，退出时统一销毁。 */
export function mountCover(host: HTMLElement, options: Options): Dispose {
  host.replaceChildren();
  const abort = new AbortController();
  const { signal } = abort;
  const status = options.status;
  let cleanup: Dispose = () => {};
  const controls = document.createElement("div");
  controls.className = "play-controls";

  if (options.kind === "photos") {
    host.style.backgroundImage = `url("${options.basePath}/moonlit-ocean-pramod-tiwari.jpg")`;
    host.style.backgroundSize = "contain";
    host.style.backgroundPosition = "center";
    host.style.backgroundRepeat = "no-repeat";
    const { canvas, ctx, point } = makeCanvas(host);
    ctx.fillStyle = "rgba(5, 13, 21, .97)"; ctx.fillRect(0, 0, 900, 600);
    ctx.fillStyle = "#718497"; ctx.font = 'italic 30px Georgia'; ctx.textAlign = "center";
    ctx.fillText("A little light, left by you.", 450, 260);
    const cells = new Set<string>();
    let pointer: number | null = null, last: Point | null = null;
    const reveal = (a: Point, b: Point) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 76; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12) + 1;
      for (let step = 0; step <= steps; step++) {
        const x = a.x + (b.x - a.x) * step / steps, y = a.y + (b.y - a.y) * step / steps;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const col = Math.floor(x / 25) + dx, row = Math.floor(y / 25) + dy;
          if (col >= 0 && col < 36 && row >= 0 && row < 24) cells.add(`${col}:${row}`);
        }
      }
    };
    canvas.addEventListener("pointerdown", e => {
      if (!e.isPrimary || e.button !== 0) return;
      pointer = e.pointerId; last = point(e); canvas.setPointerCapture(pointer); reveal(last, last);
    }, { signal });
    canvas.addEventListener("pointermove", e => {
      if (e.pointerId !== pointer || !last) return;
      const next = point(e); reveal(last, next); last = next;
    }, { signal });
    const finish = () => {
      if (pointer === null) return;
      pointer = null; last = null;
      status(`已显影约 ${Math.min(100, Math.round(cells.size / 864 * 100))}% · 继续划过暗处，或点“显影整幅”。`);
    };
    canvas.addEventListener("pointerup", finish, { signal });
    canvas.addEventListener("pointercancel", finish, { signal });
    canvas.addEventListener("lostpointercapture", finish, { signal });
    host.append(controls);
    control(controls, "显影整幅", () => { ctx.clearRect(0, 0, 900, 600); status("这片月夜，被你重新看见了。作品入口仍在右侧。 "); });
    status("按住并划过暗处，让一幅月夜摄影逐渐显影。也可以用下方按钮查看全图。");
  } else if (options.kind === "faerie") {
    const { canvas, ctx, point } = makeCanvas(host);
    let path: Point[] = [], pointer: number | null = null, frame = 0;
    const drawPath = () => {
      ctx.strokeStyle = "#d4e7df"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
      ctx.shadowBlur = 14; ctx.shadowColor = "#8bc6b5";
      ctx.beginPath(); path.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.shadowBlur = 0;
    };
    const cast = () => {
      const rune = recognizeRune(path);
      const names = { moon: "月环 · 一圈月光，唤醒林间的萤火。", spark: "星芒 · 折线里的星火向外散开。", breeze: "微风 · 光沿着你画过的方向流动。", none: "再画大一些：闭合圆环、折线和长弧会得到不同回应。" };
      status(names[rune]);
      if (rune === "none") return;
      cancelAnimationFrame(frame);
      const center = path.reduce((sum, p) => ({ x: sum.x + p.x / path.length, y: sum.y + p.y / path.length }), { x: 0, y: 0 });
      const start = performance.now();
      const render = (now: number) => {
        const t = motionAllowed() ? (now - start) / 1800 : .25;
        ctx.clearRect(0, 0, 900, 600);
        ctx.globalAlpha = Math.max(0, 1 - t); drawPath();
        for (let i = 0; i < 48; i++) {
          const source = path[Math.floor(i / 48 * path.length)];
          const angle = i * 2.39996;
          let x = source.x, y = source.y;
          if (rune === "moon") { x = center.x + Math.cos(angle + t) * (100 + t * 140); y = center.y + Math.sin(angle + t) * (100 + t * 140); }
          else if (rune === "spark") { x += Math.cos(angle) * t * 230; y += Math.sin(angle) * t * 230; }
          else { x += Math.sin(angle + t * 3) * t * 85; y -= t * 140; }
          ctx.fillStyle = i % 3 ? "#c9e5db" : "#eadbb4";
          ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (motionAllowed() && t < 1) frame = requestAnimationFrame(render);
      };
      render(start);
    };
    canvas.addEventListener("pointerdown", e => {
      if (!e.isPrimary || e.button !== 0) return;
      cancelAnimationFrame(frame); ctx.clearRect(0, 0, 900, 600);
      path = [point(e)]; pointer = e.pointerId; canvas.setPointerCapture(pointer);
    }, { signal });
    canvas.addEventListener("pointermove", e => {
      if (e.pointerId !== pointer) return;
      const p = point(e), last = path.at(-1)!;
      if (path.length < 450 && Math.hypot(p.x - last.x, p.y - last.y) > 4) { path.push(p); ctx.clearRect(0, 0, 900, 600); drawPath(); }
    }, { signal });
    canvas.addEventListener("pointerup", e => { if (e.pointerId === pointer) { pointer = null; cast(); } }, { signal });
    const cancel = () => { pointer = null; };
    canvas.addEventListener("pointercancel", cancel, { signal }); canvas.addEventListener("lostpointercapture", cancel, { signal });
    host.append(controls);
    control(controls, "绘制月环", () => { path = Array.from({ length: 65 }, (_, i) => ({ x: 450 + Math.cos(i / 64 * Math.PI * 2) * 105, y: 265 + Math.sin(i / 64 * Math.PI * 2) * 105 })); cast(); });
    control(controls, "绘制星芒", () => { path = Array.from({ length: 13 }, (_, i) => ({ x: 280 + i * 28, y: 210 + (i % 2) * 120 })); cast(); });
    status("按住画一个圆环、折线或长弧，再松开。不同笔迹，会唤醒不同的光。");
    cleanup = () => cancelAnimationFrame(frame);
  } else if (options.kind === "gridwake") {
    const field = document.createElement("div"); field.className = "target-field"; host.append(field);
    const positions = [[22, 28], [70, 58], [42, 40], [78, 24], [28, 63], [58, 30]];
    let hits = 0, misses = 0, started = 0;
    const target = document.createElement("button"); target.type = "button"; target.className = "grid-target";
    field.append(target);
    const show = () => { target.style.left = `${positions[hits][0]}%`; target.style.top = `${positions[hits][1]}%`; target.textContent = String(hits + 1).padStart(2, "0"); target.setAttribute("aria-label", `命中节点 ${hits + 1}`); };
    target.addEventListener("click", e => {
      e.stopPropagation();
      const now = performance.now(); if (!started) started = now;
      hits++;
      if (hits === 6) {
        target.hidden = true;
        status(`六个节点已点亮 · 首次命中后用时 ${((now - started) / 1000).toFixed(2)} 秒 · 空击 ${misses} 次。`);
        const done = document.createElement("p"); done.className = "target-complete"; done.textContent = "SECTOR CLEAR"; field.append(done);
      } else { show(); status(`${hits} / 6 节点已点亮 · 下一个目标已经出现。`); }
    }, { signal });
    field.addEventListener("click", () => { if (hits < 6) { misses++; status(`${hits} / 6 节点 · 空击 ${misses} 次。瞄准编号光点再试一次。`); } }, { signal });
    show(); status("依次点亮六个目标。第一击后开始计时；键盘 Tab / Enter 也能完成。 ");
  } else if (options.kind === "roamisle") {
    const stops = [ { name: "旧城", x: 130, y: 160 }, { name: "山林", x: 380, y: 105 }, { name: "海湾", x: 580, y: 320 }, { name: "灯塔", x: 760, y: 180 } ];
    const map = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    map.setAttribute("viewBox", "0 0 900 450"); map.classList.add("route-map"); map.setAttribute("aria-hidden", "true");
    const line = document.createElementNS(map.namespaceURI, "polyline"); line.setAttribute("class", "route-line"); map.append(line);
    stops.forEach(s => {
      const c = document.createElementNS(map.namespaceURI, "circle"); c.setAttribute("cx", String(s.x)); c.setAttribute("cy", String(s.y)); c.setAttribute("r", "6"); c.setAttribute("class", "route-dot"); map.append(c);
      const text = document.createElementNS(map.namespaceURI, "text"); text.setAttribute("x", String(s.x)); text.setAttribute("y", String(s.y - 21)); text.textContent = s.name; map.append(text);
    });
    const traveller = document.createElementNS(map.namespaceURI, "circle"); traveller.setAttribute("r", "9"); traveller.setAttribute("class", "route-traveller"); traveller.setAttribute("visibility", "hidden"); map.append(traveller);
    host.append(map);
    const note = document.createElement("p"); note.className = "route-note"; note.textContent = "示例路线纸 · 非真实地图或 AI 行程"; host.append(note);
    const routeList = document.createElement("div"); routeList.className = "route-stops"; host.append(routeList);
    let route = [0, 1, 2, 3], frame = 0;
    const stop = () => { cancelAnimationFrame(frame); traveller.setAttribute("visibility", "hidden"); };
    const update = () => {
      stop(); line.setAttribute("points", route.map(i => `${stops[i].x},${stops[i].y}`).join(" "));
      Array.from(routeList.children).forEach((node, index) => { const button = node as HTMLButtonElement; button.textContent = `${index + 1} · ${stops[route[index]].name}`; button.setAttribute("aria-label", `${stops[route[index]].name}，第 ${index + 1} 站；使用左右方向键调整顺序`); });
    };
    for (let index = 0; index < 4; index++) {
      const button = control(routeList, "", () => { route = moveStop(route, index, (index + 1) % 4); update(); status("路线已重排。点击“沿途出发”，看看新的顺序。"); });
      let drag: { id: number; x: number; y: number } | null = null, moved = false;
      // 点击轮换、键盘排序与拖拽是等价路径，不要求用户必须拖动。
      button.addEventListener("pointerdown", e => { if (!e.isPrimary || e.button !== 0) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; moved = false; button.setPointerCapture(e.pointerId); }, { signal });
      button.addEventListener("pointermove", e => {
        if (!drag || drag.id !== e.pointerId) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        moved ||= Math.hypot(dx, dy) > 8;
        if (moved) { button.style.transform = `translate(${dx}px, ${dy}px)`; button.classList.add("dragging"); }
      }, { signal });
      button.addEventListener("pointerup", e => {
        if (!drag || drag.id !== e.pointerId) return;
        button.style.transform = ""; button.classList.remove("dragging");
        if (moved) {
          const bounds = routeList.getBoundingClientRect();
          const to = clamp(Math.floor((e.clientX - bounds.left) / bounds.width * 4), 0, 3);
          route = moveStop(route, index, to); update(); status(`新的顺序：${route.map(i => stops[i].name).join(" → ")}`);
        }
        drag = null;
      }, { signal });
      button.addEventListener("click", e => { if (moved) { e.stopImmediatePropagation(); moved = false; } }, { signal, capture: true });
      const cancel = () => { drag = null; button.style.transform = ""; button.classList.remove("dragging"); };
      button.addEventListener("pointercancel", cancel, { signal }); button.addEventListener("lostpointercapture", cancel, { signal });
      button.addEventListener("keydown", e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); const to = clamp(index + (e.key === "ArrowLeft" ? -1 : 1), 0, 3); route = moveStop(route, index, to); update(); (routeList.children[to] as HTMLButtonElement).focus(); status(`新的顺序：${route.map(i => stops[i].name).join(" → ")}`); } }, { signal });
    }
    host.append(controls);
    control(controls, "沿途出发", () => {
      stop(); const start = performance.now(); const ordered = route.map(i => stops[i]);
      traveller.setAttribute("visibility", "visible");
      const render = (now: number) => {
        const t = motionAllowed() ? clamp((now - start) / 4200) : 1;
        const section = Math.min(2, Math.floor(t * 3)), local = t === 1 ? 1 : t * 3 - section;
        const a = ordered[section], b = ordered[section + 1];
        traveller.setAttribute("cx", String(a.x + (b.x - a.x) * local)); traveller.setAttribute("cy", String(a.y + (b.y - a.y) * local));
        if (t < 1) frame = requestAnimationFrame(render);
        else status(`已抵达${ordered[3].name}。这只是路线小实验；真实规划请进入 RoamIsle。`);
      }; render(start);
    });
    update(); status("拖动四张地点签改变路线；也可以点击轮换，或用左右方向键排序。");
    cleanup = stop;
  } else {
    throw new Error("这座岛屿暂时没有封面实验。");
  }
  return () => { abort.abort(); cleanup(); host.replaceChildren(); host.removeAttribute("style"); };
}
