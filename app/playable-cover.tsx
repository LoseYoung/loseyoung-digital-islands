"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PLAY_EVENT } from "./play/runtime";
import { watchPause, type PlaySession } from "./play/session";
import type { Island } from "./islands";

const subscribe = () => () => {};
const experiments: Record<string, string> = { photos: "手绘显影", faerie: "林间符文", gridwake: "六点瞄准", roamisle: "路线纸" };

export default function PlayableCover({ island, basePath }: { island: Island; basePath: string }) {
  const host = useRef<HTMLDivElement>(null), frame = useRef<HTMLDivElement>(null), launch = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null), controller = useRef<PlaySession | null>(null);
  const activeRef = useRef(false), focusFrame = useRef(0);
  const [active, setActive] = useState(false), [requested, setRequested] = useState(false);
  const [round, setRound] = useState(0), [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState("");
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const name = experiments[island.id];

  const pause = () => {
    activeRef.current = false; controller.current?.pause?.();
    setActive(false); setExpanded(false);
  };
  const close = () => {
    pause(); cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => launch.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    const stopOther = (event: Event) => {
      if ((event as CustomEvent).detail !== island.id) {
        activeRef.current = false; controller.current?.pause?.(); setActive(false); setExpanded(false);
      }
    };
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => { if (activeRef.current) controller.current?.motion?.(); };
    const observer = new MutationObserver(motion);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    window.addEventListener(PLAY_EVENT, stopOther); media.addEventListener("change", motion);
    return () => { observer.disconnect(); media.removeEventListener("change", motion); window.removeEventListener(PLAY_EVENT, stopOther); cancelAnimationFrame(focusFrame.current); };
  }, [island.id]);

  // active 不参与卸载依赖：收起/离屏/切换标签页不会清掉相纸、符文或成绩。
  useEffect(() => {
    if (!requested || !host.current) return;
    let disposed = false;
    const element = host.current;
    const engine = island.id === "gridwake" ? import("./play/aim-engine")
      : island.id === "photos" ? import("./play/photo-engine")
      : island.id === "faerie" ? import("./play/rune-engine")
      : island.id === "roamisle" ? import("./play/route-engine")
      : import("./play/cover-engine");
    engine.then(module => {
      if (disposed) return;
      const instance: PlaySession = module.mountCover(element, { kind: island.id, basePath, status: message => { if (!disposed) setStatus(message); } });
      controller.current = instance;
      if (!activeRef.current) instance.pause?.();
    }).catch(() => { if (!disposed) setStatus("实验暂时无法加载。点击“重来”重试，或直接进入岛屿。"); });
    return () => { disposed = true; controller.current?.(); controller.current = null; };
  }, [requested, round, island.id, basePath]);

  useEffect(() => {
    if (!active || !frame.current) return;
    controller.current?.resume?.();
    return watchPause(frame.current, () => {
      activeRef.current = false; controller.current?.pause?.(); setActive(false); setExpanded(false);
    });
  }, [active]);

  // 在同一 dialog 节点上切换嵌入/展开，避免 portal 重挂载丢失画布与焦点。
  useEffect(() => {
    const el = dialog.current; if (!el) return;
    el.close();
    if (!active) return;
    if (expanded) el.showModal(); else el.show();
    const prior = document.documentElement.style.overflow;
    if (expanded) document.documentElement.style.overflow = "hidden";
    el.querySelector<HTMLButtonElement>(".play-expand")?.focus({ preventScroll: true });
    return () => { el.close(); if (expanded) document.documentElement.style.overflow = prior; };
  }, [active, expanded]);

  const start = () => {
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: island.id }));
    activeRef.current = true;
    if (!requested) setStatus("正在唤醒这个小世界……");
    setRequested(true); setActive(true);
  };
  return (
    <div className="island-image playable-cover" ref={frame} data-kind={island.id} data-playing={active} data-session={requested}
      onKeyDown={e => { if (active && e.key === "Escape") { e.preventDefault(); if (expanded) setExpanded(false); else close(); } }}
      onPointerDown={e => { if (active) e.stopPropagation(); }} onPointerMove={e => { if (active) e.stopPropagation(); }}>
      <a className="cover-still" href={island.url} target="_blank" rel="noopener noreferrer" aria-label={`${island.name} · 在新标签页打开`} inert={active} aria-hidden={active || undefined}>
        <img src={`${basePath}${island.cover}`} alt={island.coverAlt} width="1536" height="1024" loading="lazy" decoding="async" />
      </a>
      <button ref={launch} type="button" className="cover-launch" hidden={!ready || active || !name} onClick={start} aria-expanded={active} aria-controls={`play-${island.id}`}>
        <span aria-hidden="true">✧</span> {requested ? "继续游玩" : "试一下"} <span className="cover-launch-name">／{name}</span>
      </button>
      <dialog ref={dialog} className="cover-playground" id={`play-${island.id}`} hidden={!active} aria-label={`${island.name} · ${name}封面实验`} data-play-surface
        onCancel={e => { e.preventDefault(); if (expanded) setExpanded(false); else close(); }}>
        <div className="cover-engine" ref={host} />
        <div className="play-toolbar"><span>小实验 / {name}</span><div>
          <button className="play-expand" type="button" onClick={() => setExpanded(v => !v)} aria-pressed={expanded}>{expanded ? "回到封面" : "展开"}</button>
          <button type="button" onClick={() => { setStatus("已清空这一轮，重新开始……"); setRound(n => n + 1); }}>重来</button>
          <button type="button" onClick={close} aria-label={`收起 ${island.name} 的互动`}>收起 <span aria-hidden="true">×</span></button>
        </div></div>
        <p className="play-status" role="status">{status}</p>
      </dialog>
    </div>
  );
}
