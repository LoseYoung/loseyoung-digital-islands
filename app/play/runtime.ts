export const PLAY_EVENT = "digital-islands-play-start";
export type Dispose = () => void;

export function motionAllowed() {
  const choice = document.documentElement.dataset.motion;
  return choice === "on" || (choice !== "off" && !matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/** 所有离屏、后台、动效开关切换都走同一个清理入口，不留下计时器。 */
export function watchRest(element: Element, stop: Dispose) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const visibility = () => { if (document.hidden) stop(); };
  const preference = () => { if (!motionAllowed()) stop(); };
  const observer = new MutationObserver(preference);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  const intersection = "IntersectionObserver" in window ? new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }) : null;
  intersection?.observe(element);
  media.addEventListener("change", preference);
  document.addEventListener("visibilitychange", visibility);
  return () => { observer.disconnect(); intersection?.disconnect(); media.removeEventListener("change", preference); document.removeEventListener("visibilitychange", visibility); };
}

export function makeCanvas(host: HTMLElement, width = 900, height = 600) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.className = "play-canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); throw new Error("当前浏览器无法启动画布，请直接进入岛屿。"); }
  const point = (event: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: (event.clientX - r.left) / Math.max(r.width, 1) * width, y: (event.clientY - r.top) / Math.max(r.height, 1) * height };
  };
  return { canvas, ctx, point };
}

export function control(parent: HTMLElement, text: string, action: () => void) {
  const button = document.createElement("button");
  button.type = "button"; button.textContent = text; button.className = "play-control";
  button.addEventListener("click", action);
  parent.append(button);
  return button;
}
