/** 固定 60Hz 模拟，与显示刷新率分离；长任务后最多追赶三步。 */
export class FixedStep {
  readonly step = 1000 / 60;
  private previous = 0;
  private debt = 0;
  reset(now: number) { this.previous = now; this.debt = 0; }
  take(now: number) {
    const delta = Math.max(0, now - this.previous); this.previous = now;
    if (!Number.isFinite(delta)) { this.debt = 0; return 0; }
    this.debt = Math.min(this.step * 3, this.debt + delta);
    const steps = Math.min(3, Math.floor((this.debt + 1e-7) / this.step));
    this.debt = Math.max(0, this.debt - steps * this.step);
    return steps;
  }
}
