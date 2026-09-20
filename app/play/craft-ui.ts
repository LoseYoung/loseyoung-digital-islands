import type { Dispose } from "./runtime";
export type CraftOptions = { kind: string; basePath: string; status: (message: string) => void };
export function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const element = document.createElement(tag); element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
export function button(parent: HTMLElement, text: string, action: () => void, signal: AbortSignal) {
  const el = node("button", "craft-button", text); el.type = "button";
  el.addEventListener("click", action, { signal }); parent.append(el); return el;
}
export function lab(host: HTMLElement, code: string, title: string) {
  host.replaceChildren();
  const root = node("div", "craft-lab"), head = node("div", "craft-head");
  const identity = node("div", "craft-identity");
  identity.append(node("span", "craft-kicker", code), node("strong", "craft-title", title));
  head.append(identity); root.append(head); host.append(root);
  return { root, head };
}
export function sketch(parent: HTMLElement, width: number, height: number, className: string) {
  const canvas = node("canvas", className); canvas.width = Math.round(width); canvas.height = Math.round(height);
  canvas.setAttribute("aria-hidden", "true"); parent.append(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法启动画布，请使用按钮操作或直接进入岛屿。");
  const point = (event: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(width, (event.clientX - r.left) / Math.max(r.width, 1) * width)), y: Math.max(0, Math.min(height, (event.clientY - r.top) / Math.max(r.height, 1) * height)) };
  };
  return { canvas, ctx, point };
}
export function fitSheet(stage: HTMLElement, sheet: HTMLElement, ratio: number): Dispose {
  const fit = () => { const w = Math.min(stage.clientWidth, stage.clientHeight * ratio); sheet.style.width = `${w}px`; sheet.style.height = `${w / ratio}px`; };
  const observer = new ResizeObserver(fit); observer.observe(stage); fit();
  return () => observer.disconnect();
}
export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value)); return element;
}
