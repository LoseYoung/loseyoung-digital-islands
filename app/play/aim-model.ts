/** 六点瞄准的纯计算规则；不依赖 DOM，不把键盘操作伪报为中心命中。 */
export const AIM_COUNT = 6;
export type AimPoint = { x: number; y: number };
export type AimHit = { responseMs: number | null; kind: "center" | "hit" | "keyboard" };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function aimSequence(seed: number): AimPoint[] {
  let state = (Number.isFinite(seed) ? seed : 1) >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const pool = [
    { x: .18, y: .23 }, { x: .5, y: .2 }, { x: .82, y: .23 },
    { x: .2, y: .76 }, { x: .5, y: .78 }, { x: .8, y: .76 },
    { x: .34, y: .46 }, { x: .68, y: .48 },
  ];
  const points = pool.map(p => ({ x: clamp(p.x + (random() - .5) * .035, .15, .85), y: clamp(p.y + (random() - .5) * .035, .17, .83) }));
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [points[i], points[j]] = [points[j], points[i]];
  }
  // 先限制真实抖动后的位置，再找六点路径，避免贪心选到最后只能贴近上一靶。
  function walk(path: AimPoint[], remaining: AimPoint[]): AimPoint[] | null {
    if (path.length === AIM_COUNT) return path;
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i], previous = path.at(-1);
      if (previous && Math.hypot(p.x - previous.x, p.y - previous.y) < .34) continue;
      const route = walk([...path, p], remaining.filter((_, index) => index !== i));
      if (route) return route;
    }
    return null;
  }
  return walk([], points) ?? [pool[0], pool[5], pool[1], pool[3], pool[2], pool[4]];
}

export function hitKind(dx: number, dy: number, radius: number, keyboard = false): AimHit["kind"] {
  if (keyboard) return "keyboard";
  return radius > 0 && Number.isFinite(dx + dy + radius) && Math.hypot(dx, dy) <= radius * .34 ? "center" : "hit";
}

export function aimSummary(hits: readonly AimHit[], misses: number, elapsedMs: number) {
  const shots = hits.length + Math.max(0, Math.floor(Number.isFinite(misses) ? misses : 0));
  const responses = hits.flatMap(hit => hit.responseMs !== null && Number.isFinite(hit.responseMs) ? [Math.max(0, hit.responseMs)] : []);
  return {
    accuracy: shots ? Math.round(hits.length / shots * 100) : 0,
    elapsedMs: Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0,
    meanResponseMs: responses.length ? Math.round(responses.reduce((a, b) => a + b, 0) / responses.length) : null,
    centers: hits.filter(hit => hit.kind === "center").length,
    pointerHits: hits.filter(hit => hit.kind !== "keyboard").length,
    assisted: hits.some(hit => hit.kind === "keyboard"),
  };
}
