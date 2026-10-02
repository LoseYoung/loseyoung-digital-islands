export type PauseReason = "hidden" | "offscreen" | "closed" | "switch" | "resize";
export type PlayHandle = (() => void) & {
  pause?: (reason: PauseReason) => void;
  resume?: () => void;
  motion?: () => void;
};
export type PlayOptions = { kind: string; basePath: string; status: (message: string) => void };

/** 引擎只在重来/卸载时销毁；暂停与恢复不能抹去这一轮的用户输入。 */
export function session(dispose: () => void, controls: Omit<PlayHandle, keyof Function>): PlayHandle {
  return Object.assign(dispose, controls);
}

export function pointerSamples(event: PointerEvent): PointerEvent[] {
  const samples = event.getCoalescedEvents?.();
  return samples?.length ? samples : [event];
}
