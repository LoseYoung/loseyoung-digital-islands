import type { Dispose } from "./runtime";

/** DOM/画布在本次访问中保留；隐藏仅暂停工作，重来/卸载才销毁。 */
export type PlaySession = Dispose & {
  pause?: () => void;
  resume?: () => void;
  motion?: () => void;
};
export function session(dispose: Dispose, pause: () => void = () => {}, resume: () => void = () => {}, motion: () => void = () => {}): PlaySession {
  return Object.assign(dispose, { pause, resume, motion });
}

/** 不使用动效偏好作为退出信号。系统/站内 Motion 只通知当前引擎。 */
export function watchPause(element: Element, pause: () => void) {
  const visibility = () => { if (document.hidden) pause(); };
  const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pause(); });
  observer.observe(element); document.addEventListener("visibilitychange", visibility);
  return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
}
