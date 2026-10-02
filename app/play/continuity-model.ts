/** 会话以外的纯规则：不读取 DOM、不写存储，也不使用真实交通或玩家排名数据。 */
export type Vec2 = { x: number; y: number };
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : a));

/** 60Hz 固定步长，单次最多追赶三步；丢弃长停顿而不是让 GPU 补算几百帧。 */
export class FixedStepClock {
  readonly stepMs = 1000 / 60;
  private previous: number | null = null;
  private remainder = 0;
  reset(now: number | null = null) { this.previous = now; this.remainder = 0; }
  consume(now: number) {
    if (!Number.isFinite(now)) return 0;
    if (this.previous === null) { this.previous = now; return 0; }
    const delta = clamp(now - this.previous, 0, this.stepMs * 3);
    this.previous = now; this.remainder += delta;
    const steps = Math.min(3, Math.floor((this.remainder + 1e-7) / this.stepMs));
    this.remainder = Math.max(0, this.remainder - steps * this.stepMs);
    return steps;
  }
}

export type Spell = "moon" | "spark" | "breeze";
export type Forest = "quiet" | "gathered" | "carried" | "constellation" | "awakened" | "drifting" | "scattered" | "wind";
export function nextForest(state: Forest, spell: Spell): Forest {
  if (spell === "moon") return state === "scattered" ? "constellation" : "gathered";
  if (spell === "breeze") return state === "gathered" ? "carried" : state === "constellation" ? "drifting" : "wind";
  return state === "carried" ? "awakened" : state === "gathered" ? "constellation" : "scattered";
}
export const forestNotes: Record<Forest, string> = {
  quiet: "先聚起月光，再试着让它去往别处。",
  gathered: "月环聚起一团萤火。微风可以送它远行，星芒可以改变它的形状。",
  carried: "微风把光团送到了遗迹前。还缺一束点亮石门的星火。",
  constellation: "星火被月环收拢，结成一枚悬浮星座。试试微风。",
  awakened: "月环 → 微风 → 星芒：石门已被照亮，森林留下了回应。",
  drifting: "月环 → 星芒 → 微风：星座沿着枝梢远行，成为另一条归路。",
  scattered: "星火落入林间。月环能把散开的碎光重新收拢。",
  wind: "风经过空地，树影摇动。先留住一点月光，再让风带走它。",
};

/** 等距重采样消除手写速度的影响；只判定圆环、折线、长弧，不猜测文字。 */
export function resampleStroke(input: readonly Vec2[], count = 64): Vec2[] {
  const points = input.filter(p => Number.isFinite(p.x + p.y));
  if (points.length < 2) return [...points];
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total < .001) return [points[0]];
  const result: Vec2[] = []; let segment = 0, before = 0;
  for (let i = 0; i < count; i++) {
    const distance = total * i / (count - 1);
    while (segment < lengths.length - 1 && before + lengths[segment] < distance) before += lengths[segment++];
    const t = clamp((distance - before) / (lengths[segment] || 1), 0, 1), a = points[segment], b = points[segment + 1];
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return result;
}
export function recognizeGesture(input: readonly Vec2[]): Spell | "none" {
  if (input.length < 5) return "none";
  const p = resampleStroke(input); if (p.length < 5) return "none";
  const w = Math.max(...p.map(v => v.x)) - Math.min(...p.map(v => v.x));
  const h = Math.max(...p.map(v => v.y)) - Math.min(...p.map(v => v.y));
  const scale = Math.max(w, h), length = p.slice(1).reduce((n, v, i) => n + Math.hypot(v.x - p[i].x, v.y - p[i].y), 0);
  if (scale < 45 || length < 70 || length > scale * 8) return "none";
  const gap = Math.hypot(p[0].x - p[p.length - 1].x, p[0].y - p[p.length - 1].y);
  if (w > 35 && h > 35 && gap < scale * .3 && length > scale * 2.2) return "moon";
  // 用显著峰谷而非原始点的噪声判断折线。
  let turns = 0, direction = 0, extreme = p[0].y;
  for (const point of p.slice(1)) {
    const d = point.y - extreme;
    if (Math.abs(d) > scale * .09) {
      const next = Math.sign(d); if (direction && next !== direction) turns++;
      direction = next; extreme = point.y;
    } else if ((direction > 0 && point.y > extreme) || (direction < 0 && point.y < extreme)) extreme = point.y;
  }
  return turns >= 2 ? "spark" : "breeze";
}

const travel = [[0, 3, 4, 6], [3, 0, 2, 4], [4, 2, 0, 3], [6, 4, 3, 0]];
export type JourneyStep = { id: number; at: number; leave: number; note: string; letter: boolean; ferry: boolean; shortcut: boolean };
export function moonJourney(route: readonly number[]) {
  if (route.length !== 4 || new Set(route).size !== 4 || route.some(v => !Number.isInteger(v) || v < 0 || v > 3)) throw new Error("路线必须包含四个不重复的地点。");
  let time = 0, letter = false, ferry = false, shortcut = false;
  const steps: JourneyStep[] = [];
  route.forEach((id, index) => {
    if (index) { time += Math.max(1, travel[route[index - 1]][id] - (shortcut ? 1 : 0)); shortcut = false; }
    const at = time;
    let note = "灯塔正在等待最后一位旅人。";
    if (id === 0) { time += 2; letter = true; note = "旧城停留 2 刻，带走一封信和山林入口的线索。"; }
    if (id === 1) {
      if (letter) { shortcut = true; note = "凭信中的线索找到近路，下一段少走 1 刻。"; }
      else { time += 3; note = "未找到林间入口，在雾里多停留了 3 刻。"; }
    }
    if (id === 2) {
      ferry = at <= 6;
      if (!ferry) time += 2;
      note = ferry ? "在第 6 刻前赶上渡船，海湾为你留着一盏灯。" : "错过末班渡船，绕行海湾多花了 2 刻。";
    }
    steps.push({ id, at, leave: time, note, letter, ferry, shortcut });
  });
  const ending = route[3] !== 3 ? "stay" : time <= 12 ? "letter" : "watch";
  return { steps, total: time, ending, title: ending === "stay" ? "沿途停靠" : ending === "letter" ? "月落前的回信" : "守夜人的灯", note: ending === "stay" ? "这次没有把灯塔留作终点。旅程在另一处留宿，换个顺序再试。" : ending === "letter" ? "你在第 12 刻前把信送到灯塔，最后一束月光照亮归路。" : "抵达时月亮已经落下。守夜人仍为迟来的旅人点亮一盏灯。" };
}
export function readAimSeed(value: string | null): number | null {
  if (!value || !/^v1-\d{1,10}$/.test(value)) return null;
  const seed = Number(value.slice(3)); return Number.isInteger(seed) && seed >= 0 && seed <= 4294967295 ? seed : null;
}
export function landingMatches(point: Vec2, goal: Vec2) {
  return Number.isFinite(point.x + point.y + goal.x + goal.y) && Math.hypot((point.x - goal.x) / .065, (point.y - goal.y) / .022) <= 1;
}
