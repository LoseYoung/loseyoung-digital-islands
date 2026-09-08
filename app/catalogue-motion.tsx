"use client";

import { useEffect, useSyncExternalStore } from "react";

const preferenceKey = "digital-islands-motion";
const preferenceEvent = "digital-islands-motion-change";
let sessionPreference: "on" | "off" | null = null;

function motionEnabled() {
  let choice = sessionPreference;
  try {
    const saved = window.localStorage.getItem(preferenceKey);
    if (saved === "on" || saved === "off") choice = saved;
  } catch { /* A blocked storage API must not break navigation or motion controls. */ }
  return choice ? choice === "on" : !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeToMotion(notify: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  window.addEventListener("storage", notify);
  window.addEventListener(preferenceEvent, notify);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener("storage", notify);
    window.removeEventListener(preferenceEvent, notify);
  };
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export default function CatalogueMotion() {
  const enabled = useSyncExternalStore(subscribeToMotion, motionEnabled, () => true);

  useEffect(() => {
    const root = document.documentElement;
    const entries = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const track = document.querySelector<HTMLElement>(".journey-line");
    const route = document.querySelector<SVGPathElement>(".journey-path");
    const marker = document.querySelector<SVGCircleElement>(".journey-marker");
    const hero = document.querySelector<HTMLElement>(".hero");
    root.dataset.motion = enabled ? "on" : "off";
    if (!enabled) {
      entries.forEach((entry) => entry.removeAttribute("data-reveal-state"));
      root.style.setProperty("--journey-progress", "1");
      return () => { delete root.dataset.motion; root.style.removeProperty("--journey-progress"); };
    }

    let observer: IntersectionObserver | undefined;
    let heroObserver: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((changes) => {
        for (const change of changes) {
          if (change.isIntersecting) {
            change.target.setAttribute("data-reveal-state", "visible");
            observer?.unobserve(change.target);
          }
        }
      }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
      for (const entry of entries) {
        if (entry.getBoundingClientRect().top >= window.innerHeight) {
          entry.setAttribute("data-reveal-state", "pending");
          observer.observe(entry);
        }
      }
      heroObserver = new IntersectionObserver(([entry]) => {
        root.dataset.heroVisible = String(entry.isIntersecting);
      });
      if (hero) heroObserver.observe(hero);
    }

    let frame = 0;
    const length = route?.getTotalLength() ?? 0;
    const update = () => {
      // Draw to the reading position inside the viewport, not to document scroll %.
      // This keeps the moving tip visible instead of extending below the screen.
      if (track) {
        const bounds = track.getBoundingClientRect();
        const progress = clamp((window.innerHeight * .74 - bounds.top) / bounds.height);
        root.style.setProperty("--journey-progress", progress.toFixed(4));
        if (route && marker) {
          const point = route.getPointAtLength(length * progress);
          marker.setAttribute("cx", point.x.toFixed(2));
          marker.setAttribute("cy", point.y.toFixed(2));
        }
      }
      frame = 0;
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    const revealFocus = (event: FocusEvent) => {
      if (event.target instanceof Element) event.target.closest("[data-reveal]")?.setAttribute("data-reveal-state", "visible");
    };
    const revealFragment = () => {
      let id = window.location.hash.slice(1);
      try { id = decodeURIComponent(id); } catch { /* Ignore malformed external fragments. */ }
      const section = document.getElementById(id);
      section?.querySelectorAll("[data-reveal]").forEach((entry) => entry.setAttribute("data-reveal-state", "visible"));
      schedule();
    };
    const visibility = () => { root.dataset.pageVisible = String(!document.hidden); };
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : undefined;
    resizeObserver?.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("hashchange", revealFragment);
    document.addEventListener("focusin", revealFocus);
    document.addEventListener("visibilitychange", visibility);
    visibility(); update(); revealFragment();

    return () => {
      observer?.disconnect(); heroObserver?.disconnect(); resizeObserver?.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", revealFragment);
      document.removeEventListener("focusin", revealFocus);
      document.removeEventListener("visibilitychange", visibility);
      entries.forEach((entry) => entry.removeAttribute("data-reveal-state"));
      root.style.removeProperty("--journey-progress");
      delete root.dataset.motion; delete root.dataset.heroVisible; delete root.dataset.pageVisible;
    };
  }, [enabled]);

  const toggle = () => {
    sessionPreference = enabled ? "off" : "on";
    try { window.localStorage.setItem(preferenceKey, sessionPreference); } catch { /* Keep the choice for this page session. */ }
    window.dispatchEvent(new Event(preferenceEvent));
  };

  return <button type="button" className="motion-toggle" onClick={toggle} aria-pressed={enabled} aria-label={enabled ? "暂停页面动效" : "开启页面动效"} title="默认遵循系统减少动态效果偏好；可手动切换并记住选择"><span className="motion-indicator" aria-hidden="true" /><span lang="en">Motion {enabled ? "on" : "off"}</span></button>;
}
