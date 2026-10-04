/** 首页玩具的确定性状态：组合顺序与路线选择会留下不同结果。 */
export type Spell = "moon" | "spark" | "breeze";
export type ForestState = "quiet" | "gathered" | "carried" | "sigil" | "lit" | "seeds";
export function weaveSpell(state: ForestState, spell: Spell): ForestState {
  if (spell === "moon") return "gathered";
  if (spell === "breeze") return state === "gathered" ? "carried" : state === "sigil" ? "seeds" : state;
  return state === "carried" ? "lit" : state === "gathered" ? "sigil" : state;
}
export const forestNotes: Record<ForestState, string> = {
  quiet: "遗迹仍在暗处。先用月环聚起一团光。",
  gathered: "月光已聚拢：用微风送走，或用星芒刻下符印。",
  carried: "微风把光送到遗迹前。再用星芒点亮它。",
  sigil: "星火在月环中结成符印。风能把它带往何处？",
  lit: "遗迹已点亮 · 月环 → 微风 → 星芒。光留在了森林里。",
  seeds: "符印化作种子 · 月环 → 星芒 → 微风。枝梢留下另一种光。",
};

export type Journey = { arrivals: number[]; departures: number[]; total: number; boat: boolean; ending: "delivered" | "late" | "elsewhere"; note: string };
const travel = [[0,3,7,11],[3,0,3,5],[7,3,0,4],[11,5,4,0]];
export function moonJourney(order: readonly number[]): Journey {
  if (order.length !== 4 || new Set(order).size !== 4 || order.some(n => !Number.isInteger(n) || n < 0 || n > 3)) throw new Error("路线必须包含四个不同地点。");
  let time = 0, map = false, boat = false;
  const arrivals: number[] = [], departures: number[] = [];
  for (let i = 0; i < order.length; i++) {
    const place = order[i];
    if (i > 0) {
      const from = order[i - 1];
      if (from === 2 && place === 3) { boat = time <= 11; time += boat ? 2 : 8; }
      else time += from === 1 && place === 3 && map ? 2 : travel[from][place];
    }
    arrivals.push(time);
    if (place === 0) { time += 3; map = true; }
    if (place === 1 || place === 2) time += 1;
    departures.push(time);
  }
  const ending = order[3] !== 3 ? "elsewhere" : arrivals[3] <= 14 ? "delivered" : "late";
  const note = ending === "delivered" ? "赶在月落之前，把旧城的信交到了守塔人手里。"
    : ending === "late" ? "灯已经熄了。信留在门边，海湾给你留了一晚星光。"
    : "你没有走向灯塔，却在另一个地方找到了自己的停靠。";
  return { arrivals, departures, total: time, boat, ending, note };
}

/** 比较必须同种子、同规则、同场地大小、同输入方式，且都是未中断的连续回合。 */
export type Attempt = { key: string; elapsed: number; responses: (number | null)[]; interrupted: boolean };
export function compareAttempt(previous: Attempt | null, current: Attempt) {
  if (!previous || previous.key !== current.key || previous.interrupted || current.interrupted) return null;
  return { elapsed: current.elapsed - previous.elapsed, responses: current.responses.map((n, i) => n === null || previous.responses[i] == null ? null : n - previous.responses[i]!) };
}
export function challengeSeed(value: string | null): number | null {
  if (value === null || !/^\d{1,10}$/.test(value)) return null;
  const n = Number(value); return Number.isInteger(n) && n >= 0 && n <= 4294967295 ? n : null;
}
