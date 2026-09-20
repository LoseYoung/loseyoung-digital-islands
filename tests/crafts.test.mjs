import assert from 'node:assert/strict';
import test from 'node:test';
import { Exposure, segmentDistance, runeTemplate, routeStops, routeSample, nearestStop } from '../app/play/craft-model.ts';
import { recognizeRune } from '../app/play/physics.ts';

test('底片重复覆盖不虚增，范围受限，完整显影到 100%', () => {
  const e = new Exposure(); assert.equal(e.percent, 0);
  e.paint({x:120,y:200}, {x:700,y:260}, 50); const once=e.percent; assert.ok(once>0 && once<40);
  e.paint({x:120,y:200}, {x:700,y:260}, 50); assert.equal(e.percent,once);
  e.paint({x:NaN,y:0},{x:Infinity,y:0}, 50); assert.equal(e.percent,once);
  e.fill(); assert.equal(e.percent,100);
});
test('光刷用线段覆盖，快速移动也不中断，宽笔覆盖更多', () => {
  assert.equal(segmentDistance({x:50,y:10},{x:0,y:0},{x:100,y:0}),10);
  assert.equal(segmentDistance({x:0,y:0},{x:0,y:0},{x:0,y:0}),0);
  const fine=new Exposure(),soft=new Exposure();
  fine.paint({x:50,y:250},{x:850,y:250},25);soft.paint({x:50,y:250},{x:850,y:250},58);assert.ok(soft.percent>fine.percent);
});
test('三种辅助模板与真实几何判别一致', () => {
  for(const kind of ['moon','spark','breeze']) assert.equal(recognizeRune(runeTemplate(kind)),kind);
});
test('沿路径按总弧长推进，而不是每个路段分配相同时长', () => {
  const points=[{x:0,y:0},{x:10,y:0},{x:100,y:0}];
  assert.equal(routeSample(points,.5).x,50);assert.equal(routeSample(points,.5).segment,1);
  assert.equal(routeSample(points,0).x,0);assert.equal(routeSample(points,1).x,100);
  assert.equal(routeSample(points,5).x,100);assert.equal(routeSample(points,-1).x,0);
});
test('空路径、零长度路径与极端进度返回有限坐标', () => {
  for(const points of [[],[{x:2,y:3}],[{x:2,y:3},{x:2,y:3}]]) {
    for(const t of [0,.5,1,NaN,Infinity]) {
      const p=routeSample(points,t);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.angle));
    }
  }
  const points=routeStops.map(s=>({x:s.x,y:s.y})); assert.deepEqual({x:routeSample(points,1).x,y:routeSample(points,1).y},points.at(-1));
});
test('按真实中心选择落点，支持宽度差异和换行', () => {
  const centers=[{x:15,y:30},{x:90,y:30},{x:15,y:100},{x:90,y:100}];
  assert.equal(nearestStop({x:88,y:99},centers),3);assert.equal(nearestStop({x:0,y:95},centers),2);assert.equal(nearestStop({x:0,y:0},[]),-1);
});
