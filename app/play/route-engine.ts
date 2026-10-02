import { moveStop } from "./physics";
import { routeStops, routeSample, nearestStop } from "./craft-model";
import { moonJourney } from "./continuity-model";
import { motionAllowed } from "./runtime";
import { session } from "./session";
import { lab, node, button, svg, type CraftOptions } from "./craft-ui";

/** 虚构路线纸：自由漫游与有限规则的小故事，不产生真实距离、交通信息或 AI 行程。 */
export function mountCover(host: HTMLElement, options: CraftOptions) {
  const abort = new AbortController(), { signal } = abort;
  const { root, head } = lab(host, "ROUTE STUDY / 04", "给下一次抵达，留一个不同的结尾"); root.classList.add("route-lab");
  const progress = node("div", "craft-counter", "00 / 04"); head.append(progress);
  const modes = node("div", "route-modes"); root.append(modes);
  const free = button(modes, "自由漫游", () => changeMode(false), signal), challengeButton = button(modes, "赶在月落前", () => changeMode(true), signal);
  const mission = node("div", "route-mission"); mission.hidden = true;
  const preview = node("span", "route-cost"); mission.append(preview);
  const rules = node("details", "route-rules"); rules.append(node("summary", "", "查看规则"), node("p", "", "虚构刻度，不是真实时间：灯塔在第 12 刻后熄灯。旧城停留 2 刻，取得信与近路线索；没有线索进入山林多花 3 刻，有线索则下一段少花 1 刻。第 6 刻后到海湾会错过渡船，绕行多花 2 刻。把灯塔排在最后试试。")); mission.append(rules); root.append(mission);
  const stage = node("div", "route-stage"); root.append(stage);
  const map = svg("svg", { viewBox: "0 0 900 400", class: "route-map", "aria-hidden": "true" }); stage.append(map);
  const terrain = svg("g", { class: "route-terrain" }); map.append(terrain);
  for (let i = 0; i < 7; i++) terrain.append(svg("path", { d: `M ${210-i*26} 0 C ${125-i*24} ${110+i*8}, ${415+i*18} ${230+i*9}, ${190+i*4} 400` }));
  for (let i = 0; i < 5; i++) terrain.append(svg("path", { d: `M ${500+i*27} 400 Q ${430+i*26} ${180-i*12} 900 ${220-i*29}` }));
  terrain.append(svg("path", { d: "M 90 276 l 24 -20 20 20 m 3 0 24 -20 20 20 M 310 90 l 20 -36 20 36 m -10 0 23 -46 25 46 M 751 146 l 0 -45 27 0 0 45 m -37 -50 47 0 m -35 -10 25 0", class: "route-sketches" }));
  const moon = svg("circle", { cx: "850", cy: "45", r: "10", class: "route-moon" }); map.append(moon);
  const fog = svg("ellipse", { cx: "348", cy: "120", rx: "73", ry: "48", class: "route-fog" }); map.append(fog);
  const ferry = svg("path", { d: "M 510 326 h 64 l -12 13 h -40 Z M 541 326 v -28 l 20 20 h -20", class: "route-ferry" }); map.append(ferry);
  const line = svg("polyline", { class: "route-line", points: "" }), travelled = svg("polyline", { class: "route-travelled", points: "" }); map.append(line, travelled);
  const markers = routeStops.map(stop => {
    const g = svg("g", { class: "route-place", transform: `translate(${stop.x} ${stop.y})` });
    g.append(svg("circle", { r: "17", class: "route-place-ring" }), svg("circle", { r: "5", class: "route-dot" }));
    const label = svg("text", { y: "-28", class: "route-place-name" }); label.textContent = stop.name;
    const sub = svg("text", { y: "33", class: "route-place-sub" }); sub.textContent = stop.english;
    g.append(label, sub); map.append(g); return g;
  });
  const traveller = svg("g", { class: "route-traveller", visibility: "hidden" });
  traveller.append(svg("circle", { r: "17", class: "route-traveller-halo" }), svg("path", { d: "M 10 0 L -7 -6 L -3 0 L -7 6 Z", class: "route-arrow" })); map.append(traveller);
  const seal = node("div", "route-arrival"); seal.hidden = true; stage.append(seal);
  stage.append(node("span", "route-map-note", "想象地图 / NOT TO SCALE"));
  const list = node("div", "route-stops"); list.setAttribute("aria-label", "四站顺序，拖拽或用方向键调整"); root.append(list);
  const tools = node("div", "craft-tools"), log = node("span", "route-journal-note", "先选一个起点，再把沿途串起来。"); tools.append(log); root.append(tools);
  root.append(node("div", "craft-footnote route-disclaimer", "示例路线纸 · 非真实地图或 AI 行程"));
  let route = [0, 1, 2, 3], frame = 0, phase: "ready" | "moving" | "paused" | "done" = "ready", elapsed = 0, start = 0, lastVisit = -1;
  let challenge = false, suspended = false, resumeMoving = false;
  const drags: (() => void)[] = [];
  const duration = () => challenge ? 6000 : 4200;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; };
  const paint = (t: number) => {
    const points = route.map(i => routeStops[i]), p = routeSample(points, t), visited = t >= 1 ? 4 : p.segment + 1;
    traveller.setAttribute("visibility", "visible"); traveller.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${p.angle})`);
    travelled.setAttribute("points", [...points.slice(0, p.segment + 1), p].map(v => `${v.x},${v.y}`).join(" "));
    markers.forEach((m, id) => m.classList.toggle("is-visited", route.indexOf(id) < visited));
    Array.from(list.children).forEach((b, index) => { (b as HTMLElement).dataset.visited = String(index < visited); });
    progress.textContent = `${String(visited).padStart(2, "0")} / 04`;
    const journey = moonJourney(route), step = journey.steps[visited - 1];
    if (challenge) {
      const clock = t >= 1 ? journey.total : step.leave;
      root.dataset.clock = String(clock); moon.setAttribute("cy", String(45 + Math.min(clock / 12, 1.4) * 210));
      moon.setAttribute("opacity", String(clock > 12 ? .12 : .85));
      fog.setAttribute("opacity", step.letter ? ".06" : ".48");
      ferry.setAttribute("opacity", clock > 6 && !step.ferry ? ".08" : ".9");
      preview.textContent = `已走 ${clock} 刻 / 月落 12 刻${step.letter ? " · 已带上信" : ""}`;
    }
    if (visited !== lastVisit) { lastVisit = visited; log.textContent = challenge ? step.note : routeStops[route[visited - 1]].note; }
    if (t >= 1) {
      phase = "done"; root.dataset.phase = phase; seal.hidden = false;
      seal.replaceChildren(node("span", "", challenge ? "A DIFFERENT ENDING" : "ARRIVED"), node("strong", "", challenge ? journey.title : `抵达 · ${routeStops[route[3]].name}`));
      root.dataset.ending = challenge ? journey.ending : "free";
      if (challenge) log.textContent = journey.note;
      go.textContent = "再走一次";
      options.status(`已抵达${routeStops[route[3]].name}。${challenge ? journey.title + " · " + journey.note : "沿途四站已留下印记。"} 这是想象地图，不是真实旅行建议。`);
    }
  };
  const render = (now: number) => { frame = 0; if (suspended || phase !== "moving") return; const t = Math.min(1, (elapsed + now - start) / duration()); paint(t); if (phase === "moving" && t < 1) frame = requestAnimationFrame(render); };
  const pauseRoute = () => {
    if (phase !== "moving") return;
    elapsed += performance.now() - start; stop(); phase = "paused"; go.textContent = "继续行进"; root.dataset.phase = phase;
  };
  const run = () => {
    if (suspended) return;
    if (phase === "moving") { pauseRoute(); options.status("行程已暂停。继续行进，或调整地点签重新出发。"); return; }
    if (phase !== "paused") { elapsed = 0; lastVisit = -1; seal.hidden = true; }
    phase = "moving"; root.dataset.phase = phase;
    if (!motionAllowed()) { paint(1); return; }
    go.textContent = "暂停行进"; start = performance.now(); stop(); frame = requestAnimationFrame(render);
    options.status(challenge ? "每一次经过都会改变抵达的故事。留意渡船、山雾和最后的月光。" : "沿着你排出的顺序出发。可随时暂停，或拖动地点重新安排。");
  };
  const go = button(tools, "沿途出发", run, signal);
  const update = () => {
    stop(); phase = "ready"; elapsed = 0; lastVisit = -1; resumeMoving = false; root.dataset.phase = phase; delete root.dataset.ending;
    root.dataset.challenge = String(challenge); go.textContent = "沿途出发"; seal.hidden = true; traveller.setAttribute("visibility", "hidden"); travelled.setAttribute("points", "");
    line.setAttribute("points", route.map(i => `${routeStops[i].x},${routeStops[i].y}`).join(" ")); progress.textContent = "00 / 04";
    mission.hidden = !challenge; preview.textContent = `这条路线预计 ${moonJourney(route).total} 刻 / 月落 12 刻`;
    free.setAttribute("aria-pressed", String(!challenge)); challengeButton.setAttribute("aria-pressed", String(challenge));
    moon.setAttribute("cy", "45"); moon.setAttribute("opacity", challenge ? ".85" : ".25"); fog.setAttribute("opacity", challenge ? ".48" : "0"); ferry.setAttribute("opacity", challenge ? ".9" : ".25");
    Array.from(list.children).forEach((el, i) => {
      const b = el as HTMLButtonElement, stop = routeStops[route[i]];
      b.dataset.visited = "false"; b.replaceChildren(node("span", "route-stop-number", String(i + 1).padStart(2, "0")), node("strong", "", stop.name), node("span", "route-stop-grip", "⠿"));
      b.setAttribute("aria-label", `${stop.name}，第 ${i + 1} 站；使用左右方向键调整顺序`);
    });
    markers.forEach(m => m.classList.remove("is-visited")); log.textContent = `从${routeStops[route[0]].name}出发，在${routeStops[route[3]].name}停靠。`;
  };
  function changeMode(value: boolean) { challenge = value; update(); options.status(value ? "赶在第 12 刻之前将信送到灯塔。先取得旧城线索，山路和渡船会回应不同顺序。规则可展开查看。" : "回到自由漫游，没有时限。每一条路线都可以抵达。"); }
  for (let index = 0; index < 4; index++) {
    let drag: { id: number; x: number; y: number } | null = null, moved = false;
    const b = button(list, "", () => { if (suspended) return; route = moveStop(route, index, (index + 1) % 4); update(); options.status(`新的顺序：${route.map(i => routeStops[i].name).join(" → ")}`); }, signal); b.className = "route-stop";
    const clearDrag = () => { const id = drag?.id; drag = null; b.style.transform = ""; b.classList.remove("dragging"); Array.from(list.children).forEach(c => c.classList.remove("drop-here")); if (id !== undefined && b.hasPointerCapture(id)) b.releasePointerCapture(id); };
    drags.push(clearDrag);
    const destination = (e: PointerEvent) => nearestStop({ x: e.clientX, y: e.clientY }, Array.from(list.children).map(c => { const el = c as HTMLElement, r = list.getBoundingClientRect(); return { x: r.left + el.offsetLeft + el.offsetWidth / 2, y: r.top + el.offsetTop + el.offsetHeight / 2 }; }));
    b.addEventListener("pointerdown", e => { if (suspended || !e.isPrimary || e.button !== 0) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; moved = false; b.setPointerCapture(e.pointerId); }, { signal });
    b.addEventListener("pointermove", e => {
      if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved ||= Math.hypot(dx, dy) > 8;
      if (moved) { b.style.transform = `translate(${dx}px, ${Math.max(-30, Math.min(30, dy))}px) rotate(-2deg)`; b.classList.add("dragging"); Array.from(list.children).forEach((c, i) => c.classList.toggle("drop-here", i === destination(e) && i !== index)); }
    }, { signal });
    b.addEventListener("pointerup", e => {
      if (!drag || drag.id !== e.pointerId) return;
      const bounds = list.getBoundingClientRect(), inside = e.clientX >= bounds.left - 20 && e.clientX <= bounds.right + 20 && e.clientY >= bounds.top - 55 && e.clientY <= bounds.bottom + 55;
      if (moved && inside) { route = moveStop(route, index, destination(e)); update(); options.status(`新的顺序：${route.map(i => routeStops[i].name).join(" → ")}`); }
      clearDrag();
    }, { signal });
    b.addEventListener("click", e => { if (moved) { e.stopImmediatePropagation(); moved = false; } }, { signal, capture: true });
    b.addEventListener("pointercancel", clearDrag, { signal }); b.addEventListener("lostpointercapture", clearDrag, { signal });
    b.addEventListener("keydown", e => { if (suspended || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return; e.preventDefault(); const to = Math.max(0, Math.min(3, index + (e.key === "ArrowLeft" ? -1 : 1))); route = moveStop(route, index, to); update(); (list.children[to] as HTMLButtonElement).focus({ preventScroll: true }); options.status(`新的顺序：${route.map(i => routeStops[i].name).join(" → ")}`); }, { signal });
  }
  update(); options.status("自由漫游可任意重排；切到“赶在月落前”，同样四个地点会因顺序产生不同结尾。");
  return session(() => { abort.abort(); stop(); drags.forEach(fn => fn()); host.replaceChildren(); }, {
    pause: () => { if (suspended) return; resumeMoving = phase === "moving"; pauseRoute(); suspended = true; drags.forEach(fn => fn()); },
    resume: () => { if (!suspended) return; suspended = false; if (resumeMoving && motionAllowed()) run(); resumeMoving = false; },
    motion: () => { if (!motionAllowed()) { pauseRoute(); resumeMoving = false; } },
  });
}
