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

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export default function CatalogueMotion() {
  const enabled = useSyncExternalStore(subscribeToMotion, motionEnabled, () => true);

  useEffect(() => {
    const root = document.documentElement;
    const entries = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const chapters = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal='card']"));
    const hero = document.querySelector<HTMLElement>(".hero");
    root.dataset.motion = enabled ? "on" : "off";

    if (!enabled) {
      entries.forEach((entry) => entry.removeAttribute("data-reveal-state"));
      chapters.forEach((chapter) => chapter.removeAttribute("data-chapter-state"));
      root.style.removeProperty("--hero-progress");
      cards.forEach((card) => card.style.removeProperty("--card-shift"));
      return () => { delete root.dataset.motion; };
    }

    let revealObserver: IntersectionObserver | undefined;
    let chapterObserver: IntersectionObserver | undefined;
    let heroObserver: IntersectionObserver | undefined;

    if ("IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver((changes) => {
        for (const change of changes) {
          if (change.isIntersecting) {
            change.target.setAttribute("data-reveal-state", "visible");
            revealObserver?.unobserve(change.target);
          }
        }
      }, { threshold: 0.1, rootMargin: "0px 0px -14% 0px" });

      for (const entry of entries) {
        const bounds = entry.getBoundingClientRect();
        if (bounds.top >= window.innerHeight * .72) {
          entry.setAttribute("data-reveal-state", "pending");
          revealObserver.observe(entry);
        } else {
          entry.setAttribute("data-reveal-state", "visible");
        }
      }

      chapterObserver = new IntersectionObserver((changes) => {
        for (const change of changes) {
          if (change.isIntersecting) {
            change.target.setAttribute("data-chapter-state", "visible");
            chapterObserver?.unobserve(change.target);
          }
        }
      }, { threshold: 0.04, rootMargin: "0px 0px -10% 0px" });

      for (const chapter of chapters) {
        const bounds = chapter.getBoundingClientRect();
        if (bounds.top >= window.innerHeight * .68) {
          chapter.setAttribute("data-chapter-state", "pending");
          chapterObserver.observe(chapter);
        } else {
          chapter.setAttribute("data-chapter-state", "visible");
        }
      }

      heroObserver = new IntersectionObserver(([entry]) => {
        root.dataset.heroVisible = String(entry.isIntersecting);
      }, { rootMargin: "80px" });
      if (hero) heroObserver.observe(hero);
    } else {
      entries.forEach((entry) => entry.setAttribute("data-reveal-state", "visible"));
      chapters.forEach((chapter) => chapter.setAttribute("data-chapter-state", "visible"));
    }

    let frame = 0;
    const updateScrollMotion = () => {
      const viewportHeight = Math.max(window.innerHeight, 1);
      if (hero) {
        const bounds = hero.getBoundingClientRect();
        const progress = clamp(-bounds.top / Math.max(bounds.height * .82, 1));
        root.style.setProperty("--hero-progress", progress.toFixed(4));
      }

      for (const card of cards) {
        const bounds = card.getBoundingClientRect();
        if (bounds.bottom < -120 || bounds.top > viewportHeight + 120) continue;
        const center = bounds.top + bounds.height / 2;
        const relative = clamp((viewportHeight / 2 - center) / (viewportHeight * .72), -1, 1);
        card.style.setProperty("--card-shift", `${(relative * 7).toFixed(2)}px`);
      }
      frame = 0;
    };
    const scheduleScrollMotion = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScrollMotion);
    };

    const revealFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      event.target.closest("[data-reveal]")?.setAttribute("data-reveal-state", "visible");
      event.target.closest("[data-chapter]")?.setAttribute("data-chapter-state", "visible");
    };

    const revealFragment = () => {
      let id = window.location.hash.slice(1);
      try { id = decodeURIComponent(id); } catch { /* Ignore malformed external fragments. */ }
      const section = document.getElementById(id);
      section?.setAttribute("data-chapter-state", "visible");
      section?.querySelectorAll("[data-reveal]").forEach((entry) => entry.setAttribute("data-reveal-state", "visible"));
      scheduleScrollMotion();
    };

    const visibility = () => { root.dataset.pageVisible = String(!document.hidden); };
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleScrollMotion) : undefined;
    resizeObserver?.observe(document.body);
    window.addEventListener("scroll", scheduleScrollMotion, { passive: true });
    window.addEventListener("resize", scheduleScrollMotion, { passive: true });
    window.addEventListener("hashchange", revealFragment);
    document.addEventListener("focusin", revealFocus);
    document.addEventListener("visibilitychange", visibility);
    visibility();
    updateScrollMotion();
    revealFragment();

    return () => {
      revealObserver?.disconnect();
      chapterObserver?.disconnect();
      heroObserver?.disconnect();
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleScrollMotion);
      window.removeEventListener("resize", scheduleScrollMotion);
      window.removeEventListener("hashchange", revealFragment);
      document.removeEventListener("focusin", revealFocus);
      document.removeEventListener("visibilitychange", visibility);
      entries.forEach((entry) => entry.removeAttribute("data-reveal-state"));
      chapters.forEach((chapter) => chapter.removeAttribute("data-chapter-state"));
      cards.forEach((card) => card.style.removeProperty("--card-shift"));
      root.style.removeProperty("--hero-progress");
      delete root.dataset.motion;
      delete root.dataset.heroVisible;
      delete root.dataset.pageVisible;
    };
  }, [enabled]);

  const toggle = () => {
    sessionPreference = enabled ? "off" : "on";
    try { window.localStorage.setItem(preferenceKey, sessionPreference); } catch { /* Keep the choice for this page session. */ }
    window.dispatchEvent(new Event(preferenceEvent));
  };

  return <button type="button" className="motion-toggle" onClick={toggle} aria-pressed={enabled} aria-label={enabled ? "暂停页面动效" : "开启页面动效"} title="默认遵循系统减少动态效果偏好；可手动切换并记住选择"><span className="motion-indicator" aria-hidden="true" /><span lang="en">Motion {enabled ? "on" : "off"}</span></button>;
}
