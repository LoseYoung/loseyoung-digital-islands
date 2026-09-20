"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PLAY_EVENT, watchRest } from "./play/runtime";
import type { Island } from "./islands";

const subscribe = () => () => {};
const experiments: Record<string, string> = { photos: "手绘显影", faerie: "林间符文", gridwake: "六点瞄准", roamisle: "路线纸" };

export default function PlayableCover({ island, basePath }: { island: Island; basePath: string }) {
  const host = useRef<HTMLDivElement>(null), frame = useRef<HTMLDivElement>(null), launch = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(false), [round, setRound] = useState(0), [status, setStatus] = useState("");
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const name = experiments[island.id];
  const focusFrame = useRef(0);
  const close = () => { setActive(false); focusFrame.current = requestAnimationFrame(() => launch.current?.focus({ preventScroll: true })); };

  useEffect(() => {
    const start = (event: Event) => { if ((event as CustomEvent).detail !== island.id) setActive(false); };
    window.addEventListener(PLAY_EVENT, start);
    return () => { window.removeEventListener(PLAY_EVENT, start); cancelAnimationFrame(focusFrame.current); };
  }, [island.id]);

  useEffect(() => {
    if (!active || !host.current || !frame.current) return;
    let disposed = false, cleanup: (() => void) | undefined;
    const element = host.current;
    frame.current.querySelector<HTMLButtonElement>(".play-toolbar button:last-child")?.focus({ preventScroll: true });
    const unwatch = watchRest(frame.current, () => setActive(false));
    const engine = island.id === "gridwake" ? import("./play/aim-engine") : import("./play/cover-engine");
    engine.then(module => {
      if (!disposed) cleanup = module.mountCover(element, { kind: island.id, basePath, status: setStatus });
    }).catch(() => { if (!disposed) setStatus("实验暂时无法加载。可以收起后重试，或直接进入岛屿。 "); });
    return () => { disposed = true; cleanup?.(); unwatch(); };
  }, [active, round, island.id, basePath]);

  const start = () => {
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: island.id }));
    setStatus("正在唤醒这个小世界……"); setActive(true);
  };
  return (
    <div className="island-image playable-cover" ref={frame} data-kind={island.id} data-playing={active} onKeyDown={e => { if (active && e.key === "Escape") { e.preventDefault(); close(); } }}
      onPointerDown={e => { if (active) e.stopPropagation(); }} onPointerMove={e => { if (active) e.stopPropagation(); }}>
      <a className="cover-still" href={island.url} target="_blank" rel="noopener noreferrer" aria-label={`${island.name} · 在新标签页打开`} inert={active} aria-hidden={active || undefined}>
        <img src={`${basePath}${island.cover}`} alt={island.coverAlt} width="1536" height="1024" loading="lazy" decoding="async" />
      </a>
      <button ref={launch} type="button" className="cover-launch" hidden={!ready || active || !name} onClick={start} aria-expanded={active} aria-controls={`play-${island.id}`}>
        <span aria-hidden="true">✧</span> 试一下 <span className="cover-launch-name">／{name}</span>
      </button>
      <div className="cover-playground" id={`play-${island.id}`} hidden={!active} role="group" aria-label={`${island.name} · ${name}封面实验`} data-play-surface>
        <div className="cover-engine" ref={host} />
        <div className="play-toolbar"><span>小实验 / {name}</span><div>
          <button type="button" onClick={() => setRound(n => n + 1)}>重来</button>
          <button type="button" onClick={close} aria-label={`收起 ${island.name} 的互动`}>收起 <span aria-hidden="true">×</span></button>
        </div></div>
        <p className="play-status" role="status">{status}</p>
      </div>
    </div>
  );
}
