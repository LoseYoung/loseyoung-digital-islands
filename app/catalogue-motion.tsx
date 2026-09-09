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

export default function CatalogueMotion() {
  const enabled = useSyncExternalStore(subscribeToMotion, motionEnabled, () => true);

  useEffect(() => {
    const root = document.documentElement;
    const entries = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const chapters = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
    const hero = document.querySelector<HTMLElement>(".hero");
    root.dataset.motion = enabled ? "on" : "off";

    if (!enabled) {
      entries.forEach((entry) => entry.removeAttribute("data-reveal-state"));
      chapters.forEach((chapter) => chapter.removeAttribute("data-chapter-state"));
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
      }, { threshold: 0.12, rootMargin: "0px 0px -48px 0px" });

      for (const entry of entries) {
        if (entry.getBoundingClientRect().top >= window.innerHeight * .82) {
          entry.setAttribute("data-reveal-state", "pending");
          revealObserver.observe(entry);
        }
      }

      chapterObserver = new IntersectionObserver((changes) => {
        for (const change of changes) {
          if (change.isIntersecting) {
            change.target.setAttribute("data-chapter-state", "visible");
            chapterObserver?.unobserve(change.target);
          }
        }
      }, { threshold: 0.05, rootMargin: "0px 0px -12% 0px" });

      for (const chapter of chapters) {
        if (chapter.getBoundingClientRect().top >= window.innerHeight * .88) {
          chapter.setAttribute("data-chapter-state", "pending");
          chapterObserver.observe(chapter);
        } else {
          chapter.setAttribute("data-chapter-state", "visible");
        }
      }

      heroObserver = new IntersectionObserver(([entry]) => {
        root.dataset.heroVisible = String(entry.isIntersecting);
      });
      if (hero) heroObserver.observe(hero);
    }

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
    };

    const visibility = () => { root.dataset.pageVisible = String(!document.hidden); };
    window.addEventListener("hashchange", revealFragment);
    document.addEventListener("focusin", revealFocus);
    document.addEventListener("visibilitychange", visibility);
    visibility();
    revealFragment();

    return () => {
      revealObserver?.disconnect();
      chapterObserver?.disconnect();
      heroObserver?.disconnect();
      window.removeEventListener("hashchange", revealFragment);
      document.removeEventListener("focusin", revealFocus);
      document.removeEventListener("visibilitychange", visibility);
      entries.forEach((entry) => entry.removeAttribute("data-reveal-state"));
      chapters.forEach((chapter) => chapter.removeAttribute("data-chapter-state"));
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
