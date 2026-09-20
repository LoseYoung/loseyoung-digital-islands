/** 封面实验的确定性规则；不依赖 DOM、时钟或随机数。 */
export type Vec = { x: number; y: number };
export type Rune = "moon" | "spark" | "breeze";
const limit = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : a));
export function segmentDistance(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = limit(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}

/** 统计覆盖过的底片网格；重复涂同一区域不会虚增进度。 */
export class Exposure {
  readonly columns = 80;
  readonly rows = 45;
  readonly cells = new Uint8Array(this.columns * this.rows);
  paint(a: Vec, b: Vec, radius: number) {
    if (![a.x, a.y, b.x, b.y, radius].every(Number.isFinite) || radius <= 0) return;
    const x0 = limit(Math.floor((Math.min(a.x, b.x) - radius) / 900 * this.columns), 0, this.columns - 1);
    const x1 = limit(Math.ceil((Math.max(a.x, b.x) + radius) / 900 * this.columns), 0, this.columns - 1);
    const y0 = limit(Math.floor((Math.min(a.y, b.y) - radius) / 506.25 * this.rows), 0, this.rows - 1);
    const y1 = limit(Math.ceil((Math.max(a.y, b.y) + radius) / 506.25 * this.rows), 0, this.rows - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = { x: (x + .5) / this.columns * 900, y: (y + .5) / this.rows * 506.25 };
      if (segmentDistance(p, a, b) <= radius * .75) this.cells[y * this.columns + x] = 1;
    }
  }
  get percent() { return Math.round(this.cells.reduce((s, v) => s + v, 0) / this.cells.length * 100); }
  fill() { this.cells.fill(1); }
}

export function runeTemplate(kind: Rune): Vec[] {
  return Array.from({ length: 81 }, (_, i) => {
    const t = i / 80;
    if (kind === "moon") return { x: 450 + Math.cos(t * Math.PI * 2) * 122, y: 285 + Math.sin(t * Math.PI * 2) * 122 };
    if (kind === "spark") return { x: 240 + t * 420, y: 250 + Math.asin(Math.sin(t * Math.PI * 6)) / (Math.PI / 2) * 85 };
    return { x: 235 + t * 430, y: 310 - Math.sin(t * Math.PI) * 100 };
  });
}

export const routeStops = [
  { name: "旧城", english: "OLD TOWN", x: 115, y: 215, note: "从巷口出发，带上清晨的面包。" },
  { name: "山林", english: "WOODLAND", x: 348, y: 105, note: "穿过树影，把脚步放慢一点。" },
  { name: "海湾", english: "THE BAY", x: 550, y: 285, note: "沿着潮线走，让风留在衣角。" },
  { name: "灯塔", english: "LIGHTHOUSE", x: 775, y: 155, note: "在最后一束光里，暂时停靠。" },
] as const;

export function routeSample(points: readonly Vec[], progress: number) {
  if (!points.length) return { x: 0, y: 0, segment: 0, angle: 0 };
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  const total = lengths.reduce((a, b) => a + b, 0);
  let distance = limit(progress) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const a = points[i], b = points[i + 1], t = lengths[i] ? limit(distance / lengths[i]) : 1;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, segment: i, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
    }
    distance -= lengths[i];
  }
  return { ...points[0], segment: 0, angle: 0 };
}

/** 基于实际控件中心判定拖放，兼容换行、间距和窄屏。 */
export function nearestStop(point: Vec, centers: Vec[]) {
  let best = -1, distance = Infinity;
  centers.forEach((center, i) => { const d = Math.hypot(center.x - point.x, center.y - point.y); if (d < distance) { best = i; distance = d; } });
  return best;
}
