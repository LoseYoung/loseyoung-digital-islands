"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PLAY_EVENT } from "./play/runtime";
import type { PlayHandle, PauseReason } from "./play/session";
import type { Island } from "./islands";

const subscribe = () => () => {};
const experiments: Record<string, string> = { photos: "手绘显影", faerie: "林间符文", gridwake: "六点瞄准", roamisle: "路线纸" };

export default function PlayableCover({ island, basePath }: { island: Island; basePath: string }) {
  const host = useRef<HTMLDivElement>(null), frame = useRef<HTMLDivElement>(null), launch = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null), engine = useRef<PlayHandle | null>(null);
  const focusFrame = useRef(0), wakeFrame = useRef(0);
  const [opened, setOpened] = useState(false), [started, setStarted] = useState(false), [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false), [round, setRound] = useState(0), [status, setStatus] = useState("");
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const state = useRef({ opened, paused, expanded }); state.current = { opened, paused, expanded };
  const name = experiments[island.id];
  const pause = (reason: PauseReason) => { engine.current?.pause?.(reason); setPaused(true); };
  const close = () => {
    cancelAnimationFrame(wakeFrame.current); cancelAnimationFrame(focusFrame.current);
    engine.current?.pause?.("closed"); setOpened(false); setPaused(false); setExpanded(false);
    focusFrame.current = requestAnimationFrame(() => launch.current?.focus({ preventScroll: true }));
  };
  const start = () => {
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: island.id }));
    if (!started) setStatus("正在唤醒这个小世界……");
    setStarted(true); setOpened(true); setPaused(false);
  };
  const toggleExpanded = () => {
    cancelAnimationFrame(wakeFrame.current);
    engine.current?.pause?.("resize"); setExpanded(value => !value);
    wakeFrame.current = requestAnimationFrame(() => {
      if (state.current.opened && !state.current.paused) engine.current?.resume?.();
    });
  };

  useEffect(() => {
    const other = (event: Event) => {
      if ((event as CustomEvent).detail === island.id) return;
      cancelAnimationFrame(wakeFrame.current);
      engine.current?.pause?.("switch"); setOpened(false); setPaused(false); setExpanded(false);
    };
    const hidden = () => { if (document.hidden && state.current.opened) pause("hidden"); };
    const preference = () => engine.current?.motion?.();
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const mutation = new MutationObserver(preference);
    mutation.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    const intersection = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && state.current.opened && !state.current.expanded) pause("offscreen");
    });
    if (frame.current) intersection.observe(frame.current);
    window.addEventListener(PLAY_EVENT, other); document.addEventListener("visibilitychange", hidden); media.addEventListener("change", preference);
    return () => {
      cancelAnimationFrame(focusFrame.current); cancelAnimationFrame(wakeFrame.current);
      window.removeEventListener(PLAY_EVENT, other); document.removeEventListener("visibilitychange", hidden);
      media.removeEventListener("change", preference); mutation.disconnect(); intersection.disconnect();
    };
  }, [island.id]);

  useEffect(() => {
    if (!started || !host.current) return;
    let disposed = false; const element = host.current;
    const load = island.id === "gridwake" ? import("./play/aim-engine")
      : island.id === "photos" ? import("./play/photo-engine")
      : island.id === "faerie" ? import("./play/rune-engine")
      : island.id === "roamisle" ? import("./play/route-engine") : import("./play/cover-engine");
    load.then(module => {
      if (disposed) return;
      engine.current = module.mountCover(element, { kind: island.id, basePath, status: setStatus }) as PlayHandle;
      if (!state.current.opened || state.current.paused) engine.current.pause?.("closed");
    }).catch(() => { if (!disposed) setStatus("实验暂时无法加载。点击“重来”重试，或直接进入岛屿。"); });
    return () => { disposed = true; engine.current?.(); engine.current = null; };
  }, [started, round, island.id, basePath]);

  useEffect(() => {
    if (opened && !paused) engine.current?.resume?.();
  }, [opened, paused]);

  useEffect(() => {
    const element = dialog.current; if (!element) return;
    if (!opened) { if (element.open) element.close(); return; }
    if (expanded) {
      if (element.open) element.close();
      element.showModal();
      element.querySelector<HTMLButtonElement>(".expand-play")?.focus({ preventScroll: true });
    } else {
      if (element.matches(":modal")) element.close();
      if (!element.open) element.show();
    }
    element.scrollTop = 0;
  }, [opened, expanded]);

  useEffect(() => {
    if (!opened || !dialog.current) return;
    const element = dialog.current, bar = element.querySelector<HTMLElement>(".play-toolbar")!;
    const observer = new ResizeObserver(() => element.style.setProperty("--playbar-height", `${bar.offsetHeight + 14}px`));
    observer.observe(bar); return () => observer.disconnect();
  }, [opened]);

  return (
    <div className="island-image playable-cover" ref={frame} data-kind={island.id} data-playing={opened} data-running={opened && !paused} data-session={started ? "retained" : "new"}
      onPointerDown={event => { if (opened) event.stopPropagation(); }} onPointerMove={event => { if (opened) event.stopPropagation(); }}>
      <a className="cover-still" href={island.url} target="_blank" rel="noopener noreferrer" aria-label={`${island.name} · 在新标签页打开`} inert={opened} aria-hidden={opened || undefined}>
        <img src={`${basePath}${island.cover}`} alt={island.coverAlt} width="1536" height="1024" loading="lazy" decoding="async" />
      </a>
      <button ref={launch} type="button" className="cover-launch" hidden={!ready || opened || !name} onClick={start} aria-expanded={opened} aria-controls={`play-${island.id}`}>
        <span aria-hidden="true">✧</span> {started ? "继续上次" : "试一下"} <span className="cover-launch-name">／{name}</span>
      </button>
      {/* 外壳不是滚动容器，避免原生焦点把顶部工具栏卷走；小屏内容由内层滚动。 */}
      <dialog ref={dialog} className="cover-playground" id={`play-${island.id}`} data-expanded={expanded} hidden={!opened} role={expanded ? "dialog" : "group"}
        style={{ overflow: "clip" }} aria-label={`${island.name} · ${name}封面实验`} data-play-surface
        onCancel={event => { event.preventDefault(); if (expanded) setExpanded(false); else close(); }}
        onKeyDown={event => { if (event.key === "Escape" && !expanded) { event.preventDefault(); close(); } }}>
        <div className="cover-engine" ref={host} inert={paused} />
        <div className="play-toolbar"><span>小实验 / {name}</span><div>
          <button className="expand-play" type="button" onClick={toggleExpanded}>{expanded ? "还原大小" : "展开游玩"}</button>
          <button type="button" onClick={() => { setPaused(false); setRound(value => value + 1); }}>重来</button>
          <button type="button" onClick={close} aria-label={`收起 ${island.name} 的互动`}>收起 <span aria-hidden="true">×</span></button>
        </div></div>
        {paused && <div className="play-resume"><span>这一轮，还在这里。</span><p>已暂停绘图与计时，笔迹、路线和记录都保留。</p><button type="button" onClick={() => setPaused(false)}>继续本轮</button></div>}
        <p className="play-status" role="status">{status}</p>
      </dialog>
    </div>
  );
}
