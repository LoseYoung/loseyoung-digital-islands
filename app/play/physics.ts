/** 首页小实验的纯函数。坐标归一化，与屏幕尺寸、刷新率无关。 */
export type Point = { x: number; y: number };
export type Hop = { from: Point; to: Point; height: number; duration: number };
export const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

export function makeSkipPlan(start: Point, velocity: Point): Hop[] {
  const x = clamp(start.x, .05, .95);
  const y = clamp(start.y, .05, .85);
  const vx = clamp(velocity.x, -2, 2);
  const vy = clamp(velocity.y, -2, 2);
  const speed = Math.hypot(vx, vy);
  // 横向掠水比直上直下更容易连续弹跳；停住后松手只产生一次落水。
  const skim = Math.abs(vx) / Math.max(speed, .01);
  const count = 1 + Math.floor(clamp(speed * skim * 2.8, 0, 5));
  const direction = Math.abs(vx) > .04 ? Math.sign(vx) : (x > .5 ? -1 : 1);
  const room = Math.max(0, direction < 0 ? x - .06 : .94 - x);
  const distance = Math.min(room, .12 + speed * .20);
  const first = { x: x + direction * distance * .35, y: .79 };
  const hops: Hop[] = [{ from: { x, y }, to: first, height: .055, duration: clamp(.66 - speed * .07, .38, .66) }];
  for (let i = 1; i < count; i++) {
    const from = hops[i - 1].to;
    hops.push({
      from,
      to: { x: clamp(first.x + direction * distance * .65 * i / Math.max(count - 1, 1), .04, .96), y: .79 - i * .021 },
      height: .12 * Math.pow(.69, i - 1),
      duration: .43 * Math.pow(.88, i - 1),
    });
  }
  return hops;
}

export function pointOnHop(hop: Hop, progress: number): Point {
  const t = clamp(progress);
  return { x: hop.from.x + (hop.to.x - hop.from.x) * t, y: hop.from.y + (hop.to.y - hop.from.y) * t - Math.sin(Math.PI * t) * hop.height };
}

export function recognizeRune(points: Point[]): "moon" | "spark" | "breeze" | "none" {
  if (points.length < 5) return "none";
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs), height = Math.max(...ys) - Math.min(...ys);
  let length = 0, turns = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (i > 1) {
      const a = points[i - 1].y - points[i - 2].y, b = points[i].y - points[i - 1].y;
      if (Math.abs(a) > 2 && Math.abs(b) > 2 && a * b < 0) turns++;
    }
  }
  if (length < 65) return "none";
  const gap = Math.hypot(points[0].x - points.at(-1)!.x, points[0].y - points.at(-1)!.y);
  if (width > 45 && height > 45 && gap < Math.max(width, height) * .3 && length > Math.max(width, height) * 2.2) return "moon";
  return turns >= 2 ? "spark" : "breeze";
}

export function moveStop(route: number[], from: number, to: number): number[] {
  if (from < 0 || from >= route.length || to < 0 || to >= route.length) return [...route];
  const result = [...route];
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result;
}

/** 保留低帧率时的最后一段位移；停住超过 160ms 则按轻放处理。 */
export type PointerSample = { point: Point; time: number };
export function releaseVelocity(samples: PointerSample[], end: Point, now: number): Point {
  const last = samples.at(-1), first = samples[0];
  if (!first || !last || samples.length < 2 || now - last.time > 160) return { x: 0, y: 0 };
  const elapsed = Math.max((now - first.time) / 1000, .025);
  return { x: clamp((end.x - first.point.x) / elapsed, -2, 2), y: clamp((end.y - first.point.y) / elapsed, -2, 2) };
}
