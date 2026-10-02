import { AIM_COUNT, aimSequence, aimSummary, hitKind, type AimHit } from "./aim-model";
import { readAimSeed } from "./continuity-model";
import { motionAllowed } from "./runtime";
import { session, type PlayOptions } from "./session";

type Result = ReturnType<typeof aimSummary>;
type RoundRecord = { result: Result; hits: AimHit[]; spec: string; input: string; interrupted: boolean };
export function mountCover(host: HTMLElement, { status }: PlayOptions) {
  const abort = new AbortController(), { signal } = abort;
  const timers = new Set<ReturnType<typeof setTimeout>>(), animations = new Set<Animation>();
  let disposed = false, tick: ReturnType<typeof setInterval> | undefined, started: number | null = null, shownAt = 0, misses = 0, accepting = true;
  let paused = false, pausedAt = 0, interrupted = false, layout = "", input = "", latestInput = "mouse", previous: RoundRecord | null = null, completed: RoundRecord | null = null;
  const hits: AimHit[] = [], random = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(random); else random[0] = Date.now() >>> 0;
  const seed = readAimSeed(new URL(location.href).searchParams.get("aim")) ?? random[0], positions = aimSequence(seed);
  function node<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = "") { const el = document.createElement(tag); el.className = cls; el.textContent = text; return el; }
  function later(fn: () => void, ms: number) { const id = setTimeout(() => { timers.delete(id); if (!disposed && !paused) fn(); }, ms); timers.add(id); }
  function cancelEffects() { timers.forEach(id => clearTimeout(id)); timers.clear(); animations.forEach(a => { a.onfinish = null; a.cancel(); }); animations.clear(); field.querySelectorAll(".aim-impact").forEach(n => n.remove()); }
  function effect(el: HTMLElement, frames: Keyframe[], ms: number) {
    if (!motionAllowed() || !el.animate) { later(() => el.remove(), 260); return; }
    const a = el.animate(frames, { duration: ms, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }); animations.add(a);
    a.onfinish = () => { animations.delete(a); el.remove(); };
  }
  const range = node("div", "aim-range"); range.dataset.phase = "ready"; range.dataset.seed = String(seed);
  const hud = node("div", "aim-hud"), identity = node("div", "aim-identity");
  identity.append(node("span", "aim-kicker", "GRIDWAKE / 06"), node("span", "aim-phase", "等待首击")); const phase = identity.lastElementChild as HTMLElement; hud.append(identity);
  const stats = node("div", "aim-stats");
  function stat(label: string, initial: string) { const group = node("div", "aim-stat"), value = node("span", "aim-stat-value", initial); group.append(node("span", "aim-stat-label", label), value); stats.append(group); return value; }
  const counter = stat("锁定", "00 / 06"), clock = stat("用时", "0.00s"), accuracy = stat("命中率", "—"); hud.append(stats);
  const field = node("div", "target-field aim-field"); field.setAttribute("role", "group"); field.setAttribute("aria-label", "六点瞄准训练区域");
  const backdrop = node("div", "aim-backdrop"); backdrop.setAttribute("aria-hidden", "true"); backdrop.append(node("span", "aim-grid-floor"), node("span", "aim-axis aim-axis-x"), node("span", "aim-axis aim-axis-y"));
  const watermark = node("div", "aim-watermark", `SEED / ${seed}`); watermark.setAttribute("aria-hidden", "true");
  const rail = node("div", "aim-rail"); rail.setAttribute("aria-label", "六个节点的命中记录");
  const lamps = Array.from({ length: AIM_COUNT }, (_, i) => { const lamp = node("span", "aim-lamp", String(i + 1).padStart(2, "0")); lamp.setAttribute("aria-label", `节点 ${i + 1}：未命中`); rail.append(lamp); return lamp; });
  rail.append(node("span", "aim-rail-note", "同组再练 · 看见每一靶的变化")); field.append(backdrop, watermark); range.append(hud, field, rail); host.replaceChildren(range);
  const target = node("button", "grid-target aim-target"); target.type = "button";
  target.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><path class="aim-brackets" d="M20 3H10L3 10V20 M44 3H54L61 10V20 M61 44V54L54 61H44 M20 61H10L3 54V44"/><circle class="aim-ring" cx="32" cy="32" r="23"/><circle class="aim-inner" cx="32" cy="32" r="11"/><path class="aim-sights" d="M32 10V17 M32 47V54 M10 32H17 M47 32H54"/><circle class="aim-core" cx="32" cy="32" r="3"/></svg>';
  const label = node("span", "aim-target-label"); target.append(label); field.append(target);
  const spec = () => `${field.clientWidth}x${field.clientHeight}/${target.offsetWidth}`;
  const setStats = () => { counter.textContent = `${String(hits.length).padStart(2,"0")} / 06`; accuracy.textContent = hits.length + misses ? `${Math.round(hits.length/(hits.length+misses)*100)}%` : "—"; };
  const startTicker = () => { clearInterval(tick); if (started !== null && hits.length < 6 && !paused) tick = setInterval(() => { if (!disposed && !paused && started !== null) clock.textContent = `${((performance.now()-started)/1000).toFixed(2)}s`; }, 100); };
  function drawTarget(focus = false) {
    if (disposed || paused || hits.length >= 6) return;
    const p = positions[hits.length]; target.style.left = `${p.x*100}%`; target.style.top = `${p.y*100}%`; label.textContent = String(hits.length+1).padStart(2,"0");
    target.setAttribute("aria-label", `命中节点 ${hits.length+1}`); target.hidden = false; target.disabled = false; accepting = true;
    lamps.forEach((lamp,i) => lamp.classList.toggle("is-current",i===hits.length)); shownAt = performance.now(); if (focus) target.focus({ preventScroll:true });
    if (motionAllowed() && target.firstElementChild?.animate) { const a = target.firstElementChild.animate([{transform:"scale(.84)",opacity:.4},{transform:"scale(1)",opacity:1}],{duration:170,easing:"ease-out"}); animations.add(a); a.onfinish=()=>animations.delete(a); }
  }
  function impact(x: number, y: number, kind: AimHit["kind"] | "miss") {
    if (field.querySelectorAll(".aim-impact").length >= 8) return;
    const mark = node("div", `aim-impact aim-impact-${kind}`); mark.style.left=`${x}px`;mark.style.top=`${y}px`;mark.setAttribute("aria-hidden","true");
    mark.append(node("span","aim-impact-ring"),node("span","aim-impact-label",kind==="center"?"中心命中":kind==="miss"?"偏离":"命中"));
    if(kind!=="miss")for(let i=0;i<4;i++){const ray=node("i","aim-impact-ray");ray.style.setProperty("--ray-angle",`${45+i*90}deg`);mark.append(ray);}
    field.append(mark);effect(mark,[{opacity:1,transform:"translate(-50%,-50%) scale(.82)"},{opacity:0,transform:"translate(-50%,-50%) scale(1.55)"}],kind==="miss"?340:540);
  }
  function rememberInput(value: string) { input = !input ? value : input === value ? input : "mixed"; }
  function finish(now: number) {
    accepting=false;target.hidden=true;clearInterval(tick);range.dataset.phase="complete";phase.textContent=interrupted?"中断练习完成":"校准完成";
    field.querySelectorAll(".aim-impact").forEach(n=>n.remove());lamps.forEach(n=>n.classList.remove("is-current"));
    const result=aimSummary(hits,misses,started===null?0:now-started);clock.textContent=`${(result.elapsedMs/1000).toFixed(2)}s`;
    completed={ result, hits:hits.map(h=>({...h})),spec:layout,input,interrupted };
    const panel=node("div","aim-results");panel.tabIndex=-1;panel.setAttribute("aria-label","本轮六点瞄准成绩");
    panel.append(node("span","aim-result-kicker","CALIBRATION / COMPLETE"),node("strong","aim-result-title","SECTOR CLEAR"));
    const summary=node("div","aim-result-stats");
    for(const [name,value] of [["首击后用时",`${(result.elapsedMs/1000).toFixed(2)}s`],["命中率",`${result.accuracy}%`],["平均响应",result.meanResponseMs===null?"—":`${result.meanResponseMs}ms`],["中心命中",result.pointerHits?`${result.centers} / ${result.pointerHits}`:"—"]]){const cell=node("div","aim-result-stat");cell.append(node("strong","",value),node("span","",name));summary.append(cell);}
    panel.append(summary);
    const comparable=previous && !interrupted && !previous.interrupted && !result.assisted && !previous.result.assisted && input!=="mixed" && input===previous.input && layout===previous.spec;
    let note=interrupted?"中断练习 · 暂停或场地变化的回合不参与比较":result.assisted?"含键盘辅助操作 · 不与鼠标精度比较":"同组再来一次，可比较相同场地与输入下的表现。";
    if(comparable && previous){const delta=result.elapsedMs-previous.result.elapsedMs;note=`对比上一轮：${delta<0?"快了":"慢了"} ${(Math.abs(delta)/1000).toFixed(2)}s · 同组 / ${input}`;}
    else if(previous && !interrupted && !result.assisted) note="两轮输入、场地或连续性不同，仅展示成绩，不比较快慢。";
    panel.append(node("p","aim-result-note",note));
    if(comparable && previous){const splits=node("div","aim-splits");splits.setAttribute("aria-label","逐靶响应变化，负数表示更快");hits.forEach((hit,i)=>{const old=previous!.hits[i]?.responseMs;const delta=hit.responseMs!==null&&old!==null&&old!==undefined?Math.round(hit.responseMs-old):null;splits.append(node("span","",`${i+1} · ${delta===null?"—":`${delta>0?"+":""}${delta}ms`}`));});panel.append(splits);}
    const actions=node("div","aim-result-actions");
    const replay=node("button","craft-button","同组再来");replay.type="button";replay.addEventListener("click",e=>{e.stopPropagation();previous=completed;resetRound();},{signal});actions.append(replay);
    const copy=node("button","craft-button","复制同题链接");copy.type="button";
    copy.addEventListener("click",async e=>{e.stopPropagation();const url=new URL(location.origin+location.pathname);url.searchParams.set("aim",`v1-${seed}`);url.hash="islands";
      try{await navigator.clipboard.writeText(url.href);if(!disposed)status("已复制同组目标链接。链接只共享目标序列，不共享成绩；不同设备不进行排名。");}
      catch{if(disposed)return;let fallback=panel.querySelector<HTMLInputElement>(".aim-share-url");if(!fallback){fallback=node("input","aim-share-url");fallback.readOnly=true;fallback.setAttribute("aria-label","手动复制同题链接");panel.append(fallback);}fallback.value=url.href;fallback.focus();fallback.select();status("浏览器未允许复制，请手动复制已选中的链接。");}
    },{signal});actions.append(copy);panel.append(actions);field.append(panel);
    if(hits.at(-1)?.kind==="keyboard")panel.focus({preventScroll:true});
    status(`六个节点已点亮 · 首次命中后用时 ${(result.elapsedMs/1000).toFixed(2)} 秒 · 空击 ${misses} 次。${interrupted?"本轮为中断练习。":""}同组再来可比较；上方重来生成新题。`);
  }
  function resetRound(){cancelEffects();clearInterval(tick);field.querySelector(".aim-results")?.remove();hits.length=0;misses=0;started=null;interrupted=false;input="";layout="";completed=null;range.dataset.phase="ready";range.dataset.interrupted="false";phase.textContent="同组 / 等待首击";clock.textContent="0.00s";lamps.forEach((n,i)=>{delete n.dataset.hit;n.setAttribute("aria-label",`节点 ${i+1}：未命中`);});setStats();drawTarget(true);status("相同六个目标已经就位。保持场地和输入方式不变，试着比上一轮更从容。");}
  field.addEventListener("pointerdown",e=>{latestInput=e.pointerType||"mouse";},{signal});
  target.addEventListener("click",e=>{
    e.stopPropagation();if(!accepting||paused||disposed||hits.length>=6)return;accepting=false;
    const now=performance.now(), keyboard=e.detail===0, bounds=target.getBoundingClientRect(), surface=field.getBoundingClientRect();
    const cx=bounds.left+bounds.width/2,cy=bounds.top+bounds.height/2,kind=hitKind(e.clientX-cx,e.clientY-cy,bounds.width/2,keyboard);
    rememberInput(keyboard?"keyboard":latestInput);hits.push({kind,responseMs:started===null?null:Math.max(0,now-shownAt)});
    if(started===null){started=now;layout=spec();phase.textContent="校准进行中";range.dataset.phase="active";startTicker();}
    else if(layout!==spec()){interrupted=true;range.dataset.interrupted="true";}
    const lamp=lamps[hits.length-1];lamp.dataset.hit=kind;lamp.setAttribute("aria-label",`节点 ${hits.length}：${kind==="center"?"中心命中":kind==="keyboard"?"键盘命中":"命中"}`);
    impact(cx-surface.left,cy-surface.top,kind);setStats();if(hits.length===6){finish(now);return;}
    target.hidden=true;target.disabled=true;status(`${hits.length} / 6 节点已点亮 · ${kind==="center"?"中心命中":"命中"} · 空击 ${misses} 次。`);later(()=>drawTarget(keyboard),motionAllowed()?130:0);
  },{signal});
  field.addEventListener("click",e=>{if(!accepting||paused||disposed||hits.length>=6)return;misses++;rememberInput(e.detail===0?"keyboard":latestInput);setStats();const b=field.getBoundingClientRect();impact(e.clientX-b.left,e.clientY-b.top,"miss");status(`${hits.length} / 6 节点 · 空击 ${misses} 次。目标中心的细点更精确。`);},{signal});
  const observer=new ResizeObserver(()=>{if(started!==null&&hits.length<6&&layout!==spec()){interrupted=true;range.dataset.interrupted="true";}});observer.observe(field);
  drawTarget();status("依次点亮六个信标，首击后计时。完成后可以同组再练，或复制目标序列给朋友。");
  return session(()=>{disposed=true;abort.abort();clearInterval(tick);cancelEffects();observer.disconnect();host.replaceChildren();},{
    pause:()=>{if(paused)return;paused=true;pausedAt=performance.now();clearInterval(tick);cancelEffects();if(started!==null&&hits.length<6){interrupted=true;range.dataset.interrupted="true";phase.textContent="中断练习 / 已暂停";}},
    resume:()=>{if(!paused)return;const gap=performance.now()-pausedAt;paused=false;if(started!==null)started+=gap;shownAt+=gap;if(hits.length<6){if(target.hidden)drawTarget(hits.at(-1)?.kind==="keyboard");accepting=true;if(started!==null){phase.textContent="中断练习 / 继续";startTicker();}}},
    motion:()=>{if(!motionAllowed()){cancelEffects();if(!paused&&target.hidden&&hits.length<6)drawTarget();}},
  });
}
