import assert from "node:assert/strict";
import test from "node:test";
import { aimSequence, aimSummary, hitKind, AIM_COUNT } from "../app/play/aim-model.ts";

test("同一随机种子生成相同目标，新种子改变路线", () => {
  assert.deepEqual(aimSequence(42), aimSequence(42));
  assert.notDeepEqual(aimSequence(42), aimSequence(43));
});
test("一千组目标都为六点、不重复、不越界并保持移动距离", () => {
  for (let seed = 0; seed < 1000; seed++) {
    const targets = aimSequence(seed);
    assert.equal(targets.length, AIM_COUNT);
    assert.equal(new Set(targets.map(p => `${p.x}:${p.y}`)).size, AIM_COUNT);
    targets.forEach((p, i) => {
      assert.ok(p.x >= .15 && p.x <= .85 && p.y >= .17 && p.y <= .83);
      if (i) assert.ok(Math.hypot(p.x - targets[i - 1].x, p.y - targets[i - 1].y) > .3);
    });
  }
});
test("中心区、边缘区与键盘命中分别判定", () => {
  assert.equal(hitKind(0, 0, 31), "center");
  assert.equal(hitKind(8, 5, 31), "center");
  assert.equal(hitKind(22, 0, 31), "hit");
  assert.equal(hitKind(0, 0, 31, true), "keyboard");
  assert.equal(hitKind(NaN, 0, 31), "hit");
});
test("统计排除首击响应，空击影响命中率而非中心计数", () => {
  const hits = Array.from({ length: 6 }, (_, i) => ({ kind: i ? "hit" : "center", responseMs: i ? i * 100 : null }));
  assert.deepEqual(aimSummary(hits, 1, 2150), { accuracy: 86, elapsedMs: 2150, meanResponseMs: 300, centers: 1, pointerHits: 6, assisted: false });
});
test("键盘辅助不伪装为精度分数，空成绩不除零", () => {
  const result = aimSummary([{ kind: "keyboard", responseMs: null }], 0, 0);
  assert.equal(result.assisted, true); assert.equal(result.pointerHits, 0); assert.equal(result.centers, 0);
  assert.equal(result.meanResponseMs, null);
  assert.equal(aimSummary([], 0, 0).accuracy, 0);
});
test("非法输入不会生成非有限成绩或非法随机路线", () => {
  assert.equal(aimSequence(NaN).length, AIM_COUNT);
  const result = aimSummary([{ kind: "hit", responseMs: NaN }], NaN, Infinity);
  assert.equal(result.elapsedMs, 0); assert.equal(result.accuracy, 100); assert.equal(result.meanResponseMs, null);
});
