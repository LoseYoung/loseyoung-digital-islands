import { session } from "./session";
import { moonJourney } from "./story-model";
import { moveStop } from "./physics";
import { routeStops, routeSample, nearestStop } from "./craft-model";
import { motionAllowed } from "./runtime";
import { lab, node, button, svg, type CraftOptions } from "./craft-ui";

/** 路线纸是虚构地图。只记录这一轮的顺序与到访，不产生伪造地理距离。 */
export function mountCover(host: HTMLElement, options: CraftOptions) {
  const abort = new AbortController(), { signal } = abort;
  const { root, head } = lab(host, "ROUTE STUDY / 04", "给下一次出发，排个顺序"); root.classList.add("route-lab");
  const progress = node("div", "craft-counter", "00 / 04"); head.append(progress);
  const modes = node("div", "craft-toggle route-modes"); root.append(modes);
  const stage = node("div", "route-stage"); root.append(stage);
  const map = svg("svg", { viewBox: "0 0 900 400", class: "route-map", "aria-hidden": "true" }); stage.append(map);
  const terrain = svg("g", { class: "route-terrain" }); map.append(terrain);
  for (let i = 0; i < 7; i++) terrain.append(svg("path", { d: `M ${210-i*26} 0 C ${125-i*24} ${110+i*8}, ${415+i*18} ${230+i*9}, ${190+i*4} 400` }));
  for (let i = 0; i < 5; i++) terrain.append(svg("path", { d: `M ${500+i*27} 400 Q ${430+i*26} ${180-i*12} 900 ${220-i*29}` }));
  terrain.append(svg("path", { d: "M 90 276 l 24 -20 20 20 m 3 0 24 -20 20 20 M 310 90 l 20 -36 20 36 m -10 0 23 -46 25 46 M 751 146 l 0 -45 27 0 0 45 m -37 -50 47 0 m -35 -10 25 0", class: "route-sketches" }));
  const compass = svg("g", { class: "route-compass", transform: "translate(835 55)" });
  compass.append(svg("path", { d: "M0 -18 L5 5 0 1 -5 5Z M-12 0H12 M0 -12V12" }));
  const north = svg("text", { x: "0", y: "-26" }); north.textContent = "N"; compass.append(north); map.append(compass);
  const line = svg("polyline", { class: "route-line", points: "" }); map.append(line);
  const travelled = svg("polyline", { class: "route-travelled", points: "" }); map.append(travelled);
  const markers = routeStops.map(stop => {
    const g = svg("g", { class: "route-place", transform: `translate(${stop.x} ${stop.y})` });
    g.append(svg("circle", { r: "17", class: "route-place-ring" }), svg("circle", { r: "5", class: "route-dot" }));
    const label = svg("text", { y: "-28", class: "route-place-name" }); label.textContent = stop.name;
    const sub = svg("text", { y: "33", class: "route-place-sub" }); sub.textContent = stop.english;
    g.append(label, sub); map.append(g); return g;
  });
  const traveller = svg("g", { class: "route-traveller", visibility: "hidden" });
  traveller.append(svg("circle", { r: "17", class: "route-traveller-halo" }), svg("path", { d: "M 10 0 L -7 -6 L -3 0 L -7 6 Z", class: "route-arrow" })); map.append(traveller);
  const seal = node("div", "route-arrival", ""); seal.hidden = true; stage.append(seal);
  const note = node("span", "route-map-note", "想象地图 / NOT TO SCALE"); stage.append(note);
  const list = node("div", "route-stops"); list.setAttribute("aria-label", "四站顺序，拖拽或用方向键调整"); root.append(list);
  const tools = node("div", "craft-tools"), log = node("span", "route-journal-note", "先选一个起点，再把沿途串起来。");
  tools.append(log); root.append(tools);
  root.append(node("div", "craft-footnote route-disclaimer", "示例路线纸 · 非真实地图或 AI 行程"));
  let challenge = false, suspended = false;
  const sky = node("span", "route-moon", "☾"), ferry = node("span", "route-ferry", "末班渡船"), deadline = node("span", "route-deadline", "灯塔在第 14 刻熄灯");
  sky.setAttribute("aria-hidden", "true"); stage.append(sky);
  const storyHud = node("div", "route-challenge-hud"); storyHud.append(deadline, ferry); root.insertBefore(storyHud, stage);
  const rules = node("details", "route-rules");
  rules.append(node("summary", "", "查看月落规则"), node("p", "", "想象时间，不是真实行程：旧城取信并获得山路图，停留 3 刻；山林、海湾各停留 1 刻。旧城↔山林 3 刻，旧城↔海湾 7 刻，旧城↔灯塔 11 刻，山林↔海湾 3 刻，山林↔灯塔 5 刻；携山路图从山林去灯塔只需 2 刻。海湾在第 11 刻以前（含）开船，去灯塔需 2 刻；错过后绕行 8 刻。第 14 刻到达灯塔仍来得及。顺序决定结尾。"));
  root.append(rules);
  let route = [0, 1, 2, 3], frame = 0, phase: "ready" | "moving" | "paused" | "done" = "ready", elapsed = 0, start = 0, lastVisit = -1;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; };
  const paint = (t: number) => {
    const points = route.map(i => routeStops[i]);
    const itinerary = moonJourney(route), storyTime = t * itinerary.total;
    // 挑战模式按公开的旅行/停留规则行进，停留时标记不再匀速穿过节点。
    let positionProgress = t;
    if (challenge) {
      let segment = 0;
      while (segment < 3 && storyTime >= itinerary.arrivals[segment + 1]) segment++;
      const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
      const fraction = segment === 3 ? 1 : Math.max(0, Math.min(1, (storyTime - itinerary.departures[segment]) / Math.max(1, itinerary.arrivals[segment + 1] - itinerary.departures[segment])));
      positionProgress = segment === 3 ? 1 : (lengths.slice(0, segment).reduce((a, b) => a + b, 0) + lengths[segment] * fraction) / lengths.reduce((a, b) => a + b, 0);
      sky.style.transform = `translateY(${Math.min(1, storyTime / 14) * 42}px)`;
      stage.dataset.light = storyTime <= 14 ? "on" : "off";
      ferry.textContent = storyTime <= 11 ? "渡船候着 · 11 刻离港" : "渡船已离港";
      deadline.textContent = `${storyTime.toFixed(1)} / 14 刻 · ${storyTime <= 14 ? "灯还亮着" : "月已落下"}`;
    }
    const p = routeSample(points, positionProgress), visited = t >= 1 ? 4 : challenge ? itinerary.arrivals.filter(at => storyTime >= at).length : p.segment + 1;
    traveller.setAttribute("visibility", "visible"); traveller.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${p.angle})`);
    travelled.setAttribute("points", [...points.slice(0, p.segment + 1), p].map(v => `${v.x},${v.y}`).join(" "));
    markers.forEach((m, id) => m.classList.toggle("is-visited", route.indexOf(id) < visited));
    Array.from(list.children).forEach((b, index) => { (b as HTMLElement).dataset.visited = String(index < visited); });
    progress.textContent = `${String(visited).padStart(2, "0")} / 04`;
    if (visited !== lastVisit) { lastVisit = visited; log.textContent = routeStops[route[visited - 1]].note; }
    if (t >= 1) {
      phase = "done"; root.dataset.phase = phase; seal.hidden = false;
      seal.replaceChildren(node("span", "", challenge ? { delivered: "BEFORE MOONSET", late: "AFTER MOONSET", elsewhere: "ANOTHER SHORE" }[itinerary.ending] : "ARRIVED"), node("strong", "", `抵达 · ${routeStops[route[3]].name}`));
      root.dataset.ending = challenge ? itinerary.ending : "free";
      if (challenge) log.textContent = itinerary.note;
      go.textContent = "再走一次";
      options.status(challenge ? `${itinerary.note} 共 ${itinerary.total} 刻。可以重排路线尝试不同结尾；这不是实际交通规划。` : `已抵达${routeStops[route[3]].name}，沿途四站已留下印记。这是示例路线；真实旅行规划请进入 RoamIsle。`);
    }
  };
  const render = (now: number) => { if (suspended) { frame = 0; return; } const t = Math.min(1, (elapsed + now - start) / (challenge ? 6500 : 4200)); paint(t); if (phase === "moving" && t < 1) frame = requestAnimationFrame(render); else frame = 0; };
  const go = button(tools, "沿途出发", () => {
    if (suspended) return;
    if (phase === "moving") { elapsed += performance.now() - start; stop(); phase = "paused"; go.textContent = "继续行进"; root.dataset.phase = phase; options.status("行程已暂停。继续行进，或调整地点签重新出发。"); return; }
    if (phase !== "paused") { elapsed = 0; lastVisit = -1; seal.hidden = true; }
    phase = "moving"; root.dataset.phase = phase;
    if (!motionAllowed()) { paint(1); return; }
    go.textContent = "暂停行进"; start = performance.now(); stop(); frame = requestAnimationFrame(render);
    options.status("沿着你排出的顺序出发。可随时暂停，或拖动地点重新安排。");
  }, signal);
  const update = () => {
    stop(); phase = "ready"; elapsed = 0; lastVisit = -1; root.dataset.phase = phase;
    go.textContent = "沿途出发"; seal.hidden = true; traveller.setAttribute("visibility", "hidden"); travelled.setAttribute("points", "");
    line.setAttribute("points", route.map(i => `${routeStops[i].x},${routeStops[i].y}`).join(" "));
    progress.textContent = "00 / 04";
    stage.dataset.light = "on"; sky.style.transform = "";
    deadline.textContent = "灯塔在第 14 刻熄灯"; ferry.textContent = "末班渡船 · 11 刻离港";
    root.dataset.challenge = String(challenge); root.removeAttribute("data-ending"); rules.hidden = !challenge;
    Array.from(list.children).forEach((el, i) => {
      const b = el as HTMLButtonElement, stop = routeStops[route[i]];
      b.dataset.visited = "false"; b.replaceChildren(node("span", "route-stop-number", String(i + 1).padStart(2, "0")), node("strong", "", stop.name), node("span", "route-stop-grip", "⠿"));
      b.setAttribute("aria-label", `${stop.name}，第 ${i + 1} 站；使用左右方向键调整顺序`);
    });
    markers.forEach(m => m.classList.remove("is-visited")); log.textContent = `从${routeStops[route[0]].name}出发，在${routeStops[route[3]].name}停靠。`;
  };
  let free: HTMLButtonElement, moon: HTMLButtonElement;
  const selectMode = (on: boolean) => {
    challenge = on; update(); free.setAttribute("aria-pressed", String(!on)); moon.setAttribute("aria-pressed", String(on));
    options.status(on ? "赶在月落之前：按规则安排四站，最后去灯塔。路线不同，结尾不同。" : "自由路线纸：把沿途串起来，随时暂停与重排。");
  };
  free = button(modes, "自由漫游", () => selectMode(false), signal);
  moon = button(modes, "赶在月落之前", () => selectMode(true), signal);
  free.setAttribute("aria-pressed", "true"); moon.setAttribute("aria-pressed", "false");
  for (let index = 0; index < 4; index++) {
    let drag: { id: number; x: number; y: number } | null = null, moved = false;
    const b = button(list, "", () => { route = moveStop(route, index, (index + 1) % 4); update(); options.status(`新的顺序：${route.map(i => routeStops[i].name).join(" → ")}`); }, signal);
    b.className = "route-stop";
    const clearDrag = () => { drag = null; b.style.transform = ""; b.classList.remove("dragging"); Array.from(list.children).forEach(c => c.classList.remove("drop-here")); };
    const destination = (e: PointerEvent) => nearestStop({ x: e.clientX, y: e.clientY }, Array.from(list.children).map(c => {
      // 使用布局中心，不把拖动元素的视觉位移重复计入。
      const el = c as HTMLElement, r = list.getBoundingClientRect();
      return { x: r.left + el.offsetLeft + el.offsetWidth / 2, y: r.top + el.offsetTop + el.offsetHeight / 2 };
    }));
    b.addEventListener("pointerdown", e => { if (!e.isPrimary || e.button !== 0) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; moved = false; b.setPointerCapture(e.pointerId); }, { signal });
    b.addEventListener("pointermove", e => {
      if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved ||= Math.hypot(dx, dy) > 8;
      if (moved) { b.style.transform = `translate(${dx}px, ${Math.max(-30, Math.min(30, dy))}px) rotate(-2deg)`; b.classList.add("dragging"); Array.from(list.children).forEach((c, i) => c.classList.toggle("drop-here", i === destination(e) && i !== index)); }
    }, { signal });
    b.addEventListener("pointerup", e => {
      if (!drag || drag.id !== e.pointerId) return;
      const bounds = list.getBoundingClientRect(), inside = e.clientX >= bounds.left - 20 && e.clientX <= bounds.right + 20 && e.clientY >= bounds.top - 55 && e.clientY <= bounds.bottom + 55;
      if (moved && inside) { route = moveStop(route, index, destination(e)); update(); options.status(`新的顺序：${route.map(i => routeStops[i].name).join(" → ")}`); }
      clearDrag(); if (b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId);
    }, { signal });
    b.addEventListener("click", e => { if (moved) { e.stopImmediatePropagation(); moved = false; } }, { signal, capture: true });
    b.addEventListener("pointercancel", clearDrag, { signal }); b.addEventListener("lostpointercapture", clearDrag, { signal });
    b.addEventListener("keydown", e => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault();
      const to = Math.max(0, Math.min(3, index + (e.key === "ArrowLeft" ? -1 : 1)));
      route = moveStop(route, index, to); update(); (list.children[to] as HTMLButtonElement).focus({ preventScroll: true });
      options.status(`新的顺序：${route.map(i => routeStops[i].name).join(" → ")}`);
    }, { signal });
  }
  update(); options.status("拖动地点签重排路线；点击可轮换，左右方向键也可排序。排列好后，沿途出发。");
  const rest = () => {
    if (phase === "moving") {
      elapsed += performance.now() - start; stop(); phase = "paused"; root.dataset.phase = phase;
      go.textContent = "继续行进";
    }
    suspended = true;
    list.querySelectorAll<HTMLElement>(".dragging").forEach(b => { b.style.transform = ""; b.classList.remove("dragging"); });
  };
  return session(() => { abort.abort(); stop(); host.replaceChildren(); }, rest, () => { suspended = false; }, () => {
    if (phase === "moving" && !motionAllowed()) { stop(); paint(1); }
  });
}
