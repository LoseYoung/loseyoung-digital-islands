import test from "node:test";
import assert from "node:assert/strict";
import { FixedStepClock, nextForest, recognizeGesture, moonJourney, readAimSeed, landingMatches } from "../app/play/continuity-model.ts";
import { runeTemplate } from "../app/play/craft-model.ts";

test("30/60/120/144Hz 下十秒均推进六百个模拟步", () => {
  for (const hz of [30,60,120,144]) {
    const clock = new FixedStepClock(); clock.reset(0); let steps = 0;
    for (let i = 1; i <= hz * 10; i++) steps += clock.consume(i * 1000 / hz);
    assert.equal(steps, 600, `${hz}Hz 步数不一致`);
  }
});
test("长暂停最多补算三步，重置后不追赶旧时间", () => {
  const c = new FixedStepClock(); c.reset(0); assert.equal(c.consume(30000),3); c.reset(); assert.equal(c.consume(90000),0);
  assert.equal(c.consume(NaN),0); assert.ok(c.consume(89900)>=0);
});
test("符文顺序留下不同的可组合场景", () => {
  const cast = sequence => sequence.reduce(nextForest, "quiet");
  assert.equal(cast(["moon","breeze","spark"]),"awakened");
  assert.equal(cast(["moon","spark","breeze"]),"drifting");
  assert.equal(cast(["breeze","spark","moon"]),"constellation");
});
test("符文重采样兼容缩放、反向绘制与不均匀采样", () => {
  for (const kind of ["moon","spark","breeze"]) {
    const original = runeTemplate(kind);
    for (const points of [original, [...original].reverse(), original.map(p=>({x:p.x*.6+31,y:p.y*.6+70})), original.flatMap((p,i)=>Array(i%4+1).fill(p))]) assert.equal(recognizeGesture(points),kind);
  }
});
test("过短笔迹与无效坐标不会被强制识别", () => {
  assert.equal(recognizeGesture([{x:0,y:0}]),"none");
  assert.equal(recognizeGesture(Array.from({length:50},(_,i)=>({x:i/10,y:1}))),"none");
  assert.equal(recognizeGesture(Array(8).fill({x:NaN,y:0})),"none");
});
test("旅行规则让近路、渡船与终点产生可验证的后果", () => {
  const early = moonJourney([0,1,2,3]), late = moonJourney([1,0,2,3]);
  assert.equal(early.total,9); assert.equal(early.ending,"letter"); assert.equal(early.steps[2].ferry,true);
  assert.equal(late.ending,"watch"); assert.equal(late.steps[2].ferry,false); assert.ok(late.total>12);
  assert.equal(moonJourney([1,2,3,0]).ending,"stay");
});
test("全部二十四种路线都有有限结果且不改变输入", () => {
  const permute = a => a.length ? a.flatMap((n,i)=>permute(a.filter((_,j)=>j!==i)).map(rest=>[n,...rest])) : [[]];
  const endings = new Set();
  for (const route of permute([0,1,2,3])) { const copy=[...route], result=moonJourney(route); endings.add(result.ending); assert.equal(result.steps.length,4); assert.ok(Number.isFinite(result.total)); assert.deepEqual(route,copy); }
  assert.equal(endings.size,3); assert.throws(()=>moonJourney([0,0,2,3])); assert.throws(()=>moonJourney([0,1,2,NaN]));
});
test("同题种子只接受明确版本和无符号整数", () => {
  assert.equal(readAimSeed("v1-42"),42); assert.equal(readAimSeed("v1-0"),0); assert.equal(readAimSeed("v1-4294967295"),4294967295);
  for (const value of [null,"42","v2-42","v1--1","v1-4294967296","v1-1.2","v1-1<script>"]) assert.equal(readAimSeed(value),null);
});
test("精准落点按透视椭圆判定，不接受无效坐标", () => {
  const goal={x:.5,y:.706}; assert.equal(landingMatches(goal,goal),true); assert.equal(landingMatches({x:.58,y:.706},goal),false);
  assert.equal(landingMatches({x:.5,y:.74},goal),false); assert.equal(landingMatches({x:NaN,y:.706},goal),false);
});
