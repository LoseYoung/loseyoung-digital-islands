"use client";

import { useEffect } from "react";

// Progressive enhancement: the server-rendered catalogue is visible without JS.
export default function CatalogueMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stopMotion = () => {};

    const configure = () => {
      stopMotion();
      const entries = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
      if (preference.matches) {
        root.style.setProperty("--journey-progress", "1");
        return;
      }

      let observer: IntersectionObserver | undefined;
      if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver((changes) => {
          for (const change of changes) {
            if (change.isIntersecting) {
              change.target.setAttribute("data-reveal-state", "visible");
              observer?.unobserve(change.target);
            }
          }
        }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
        for (const entry of entries) {
          if (entry.getBoundingClientRect().top >= window.innerHeight) {
            entry.setAttribute("data-reveal-state", "pending");
            observer.observe(entry);
          }
        }
      }

      let frame = 0;
      const update = () => {
        const distance = root.scrollHeight - window.innerHeight;
        const progress = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 1;
        root.style.setProperty("--journey-progress", progress.toFixed(4));
        frame = 0;
      };
      const schedule = () => {
        if (!frame) frame = window.requestAnimationFrame(update);
      };
      // Keyboard and fragment navigation must never land on hidden content.
      const revealFocus = (event: FocusEvent) => {
        if (event.target instanceof Element) {
          event.target.closest("[data-reveal]")?.setAttribute("data-reveal-state", "visible");
        }
      };
      const revealFragment = () => {
        const id = window.location.hash.slice(1);
        const section = document.getElementById(id);
        section?.querySelectorAll("[data-reveal]").forEach((entry) => entry.setAttribute("data-reveal-state", "visible"));
        schedule();
      };
      const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : undefined;
      resizeObserver?.observe(document.body);
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule, { passive: true });
      window.addEventListener("hashchange", revealFragment);
      document.addEventListener("focusin", revealFocus);
      update();
      revealFragment();

      stopMotion = () => {
        observer?.disconnect();
        resizeObserver?.disconnect();
        window.cancelAnimationFrame(frame);
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        window.removeEventListener("hashchange", revealFragment);
        document.removeEventListener("focusin", revealFocus);
        entries.forEach((entry) => entry.removeAttribute("data-reveal-state"));
        root.style.removeProperty("--journey-progress");
      };
    };

    configure();
    preference.addEventListener("change", configure);
    return () => {
      stopMotion();
      root.style.removeProperty("--journey-progress");
      preference.removeEventListener("change", configure);
    };
  }, []);

  return null;
}
