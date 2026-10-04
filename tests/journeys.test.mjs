import test from 'node:test';
import assert from 'node:assert/strict';
import { FixedStep } from '../app/play/fixed-step.ts';
import { weaveSpell, moonJourney, compareAttempt, challengeSeed } from '../app/play/story-model.ts';
import { recognizeRune } from '../app/play/physics.ts';
import { runeTemplate } from '../app/play/craft-model.ts';

test('30/60/120/144Hz 下同一秒推进相同数量的水波模拟步', () => {
  for (const hz of [30,60,120,144]) {
    const clock = new FixedStep(); clock.reset(0); let count = 0;
    for (let i=1;i<=hz;i++) count += clock.take(i*1000/hz);
    assert.equal(count,60,`${hz}Hz`);
  }
});
test('卡顿不无限追赶，重新唤醒不计算离开期间的时间', () => {
  const clock = new FixedStep(); clock.reset(0); assert.equal(clock.take(4000),3);
  clock.reset(10000); assert.equal(clock.take(10000),0); assert.equal(clock.take(10017),1);
});
test('同一组符文的不同顺序留下遗迹或光种子', () => {
  const apply = sequence => sequence.reduce(weaveSpell,'quiet');
  assert.equal(apply(['moon','breeze','spark']),'lit');
  assert.equal(apply(['moon','spark','breeze']),'seeds');
  assert.equal(apply(['spark','breeze']),'quiet');
  assert.equal(apply(['moon','spark']),'sigil');
});
test('缩小与不同采样密度仍识别三种基础符文', () => {
  for (const name of ['moon','spark','breeze']) for (const scale of [.3,1,2]) {
    const points=runeTemplate(name).filter((_,i)=>i%2===0).map(p=>({x:p.x*scale+50,y:p.y*scale-80}));
    assert.equal(recognizeRune(points),name);
  }
});
test('赶上渡船、错过月落和停靠别处分别产生不同结尾', () => {
  const fast=moonJourney([0,1,2,3]), late=moonJourney([0,2,1,3]), other=moonJourney([1,2,3,0]);
  assert.equal(fast.ending,'delivered'); assert.equal(fast.boat,true); assert.equal(fast.total,13);
  assert.equal(late.ending,'late'); assert.ok(late.total>14);
  assert.equal(other.ending,'elsewhere');
});
test('二十四种顺序都遵守到达和停留的时间关系，不伪造地理距离', () => {
  const perm=a=>a.length===0?[[]]:a.flatMap((v,i)=>perm(a.filter((_,j)=>j!==i)).map(t=>[v,...t]));
  for(const order of perm([0,1,2,3])) {
    const plan=moonJourney(order); assert.ok(plan.total>0);
    for(let i=0;i<4;i++) { assert.ok(plan.departures[i]>=plan.arrivals[i]); if(i) assert.ok(plan.arrivals[i]>=plan.departures[i-1]); }
  }
  assert.throws(()=>moonJourney([0,0,1,3]));
});
test('比较排除中断与规格变化，保留每靶的改善差值', () => {
  const a={key:'seed:mouse:600',elapsed:1000,responses:[null,300,200],interrupted:false};
  const b={...a,elapsed:800,responses:[null,200,180]};
  assert.deepEqual(compareAttempt(a,b),{elapsed:-200,responses:[null,-100,-20]});
  assert.equal(compareAttempt(a,{...b,interrupted:true}),null);
  assert.equal(compareAttempt({...a,interrupted:true},b),null);
  assert.equal(compareAttempt(a,{...b,key:'seed:touch:300'}),null);
});
test('链接种子只接受合法无符号整数', () => {
  assert.equal(challengeSeed('0'),0); assert.equal(challengeSeed('4294967295'),4294967295);
  for (const s of [null,'-1','1.2','123evil','4294967296','1e9','']) assert.equal(challengeSeed(s),null);
});
