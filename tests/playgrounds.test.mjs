import assert from "node:assert/strict";
import test from "node:test";
import { makeSkipPlan, pointOnHop, recognizeRune, moveStop } from "../app/play/physics.ts";

test("轻放一次落水，横向快速投掷产生更多落点", () => {
  assert.equal(makeSkipPlan({ x: .8, y: .3 }, { x: 0, y: 0 }).length, 1);
  const fast = makeSkipPlan({ x: .8, y: .3 }, { x: -1.2, y: .15 });
  assert.ok(fast.length >= 4 && fast.length <= 6);
  assert.equal(makeSkipPlan({ x: .5, y: .3 }, { x: 0, y: 2 }).length, 1);
});

test("极端速度和边缘投掷仍限制在画面内，轨迹首尾连续", () => {
  for (const x of [-2, 0, .04, .5, .96, 1, 5]) for (const vx of [-99, -1, 0, 1, 99]) {
    const plan = makeSkipPlan({ x, y: -.5 }, { x: vx, y: .8 });
    assert.ok(plan.length >= 1 && plan.length <= 6);
    plan.forEach((hop, i) => {
      assert.ok(hop.duration > 0);
      assert.deepEqual(pointOnHop(hop, 0), hop.from);
      const end = pointOnHop(hop, 1);
      assert.ok(Math.abs(end.x - hop.to.x) < 1e-12 && Math.abs(end.y - hop.to.y) < 1e-12);
      if (i) assert.deepEqual(hop.from, plan[i - 1].to);
      for (let t = 0; t <= 1; t += .05) {
        const point = pointOnHop(hop, t);
        assert.ok(point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
      }
    });
  }
});

test("同一个时间点得到同一位置，不受 30/60/144Hz 刷新率影响", () => {
  const hop = makeSkipPlan({ x: .8, y: .2 }, { x: -1, y: .1 })[0];
  const at = .25;
  for (const fps of [30, 60, 144]) {
    const elapsed = fps * at / fps;
    assert.deepEqual(pointOnHop(hop, elapsed / hop.duration), pointOnHop(hop, at / hop.duration));
  }
});

test("圆环、折线、长弧与过短笔迹的符文反馈不同", () => {
  const circle = Array.from({ length: 65 }, (_, i) => ({ x: 450 + Math.cos(i / 64 * Math.PI * 2) * 105, y: 265 + Math.sin(i / 64 * Math.PI * 2) * 105 }));
  const zigzag = Array.from({ length: 13 }, (_, i) => ({ x: 280 + i * 28, y: 210 + (i % 2) * 120 }));
  const line = Array.from({ length: 30 }, (_, i) => ({ x: 30 + i * 8, y: 50 + i * 3 }));
  assert.equal(recognizeRune(circle), "moon"); assert.equal(recognizeRune(zigzag), "spark");
  assert.equal(recognizeRune(line), "breeze"); assert.equal(recognizeRune([{ x: 1, y: 1 }]), "none");
});

test("路线拖拽和键盘复用排序逻辑，不丢地点、不修改原数组", () => {
  const route = [0, 1, 2, 3];
  assert.deepEqual(moveStop(route, 0, 3), [1, 2, 3, 0]);
  assert.deepEqual(moveStop(route, 3, 0), [3, 0, 1, 2]);
  assert.deepEqual(moveStop(route, -1, 1), route); assert.deepEqual(route, [0, 1, 2, 3]);
});
