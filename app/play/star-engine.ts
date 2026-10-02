import { clamp, makeSkipPlan, pointOnHop, releaseVelocity, type Point, type Hop } from "./physics";
import { landingMatches } from "./continuity-model";
import { motionAllowed, PLAY_EVENT, watchRest } from "./runtime";

/** 保留局部透视海面：抓取预览、接触闪光与有限水珠，不增加全屏模拟。 */
export function mountStar(host: HTMLElement, report: (message: string) => void) {
  const button = host.querySelector<HTMLButtonElement>(".throw-star")!, canvas = host.querySelector<HTMLCanvasElement>("canvas")!, ctx = canvas.getContext("2d");
  if (!ctx) { button.hidden = true; return () => {}; }
  const abort = new AbortController(), { signal } = abort;
  let width = 1, height = 1, frame = 0, previewFrame = 0, plan: Hop[] = [], index = 0, hopStart = 0, busy = false, throws = 0;
  let rings: { x: number; y: number; at: number; scale: number; precise: boolean }[] = [], trail: Point[] = [];
  let pointer: number | null = null, dragged = false, origin: Point = { x:.82,y:.14 }, samples: { point:Point;time:number }[] = [], suppressClick = false;
  const goal = () => ({ x: [.34,.58,.73][Math.max(0,throws-1)%3], y:.706 });
  const restore = () => { button.style.removeProperty("left");button.style.removeProperty("top");button.dataset.flying="false";button.dataset.dragging="false";button.setAttribute("aria-busy","false"); };
  const clear = () => ctx.clearRect(0,0,width,height);
  const cancel = () => {
    cancelAnimationFrame(frame);cancelAnimationFrame(previewFrame);frame=previewFrame=0;busy=false;rings=[];trail=[];plan=[];
    const id=pointer;pointer=null;if(id!==null&&button.hasPointerCapture(id))button.releasePointerCapture(id);
    samples=[];restore();clear();
  };
  const resize = () => {
    cancel();const r=host.getBoundingClientRect();width=r.width;height=r.height;
    const ratio=Math.min(devicePixelRatio||1,1.25,1600/Math.max(width,height,1));canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));ctx.setTransform(ratio,0,0,ratio,0,0);
  };
  const local=(e:PointerEvent):Point=>{const r=host.getBoundingClientRect();return{x:clamp((e.clientX-r.left)/Math.max(r.width,1),.04,.96),y:clamp((e.clientY-r.top)/Math.max(r.height,1),.03,.86)};};
  function drawGoal() {
    if(!throws)return;const p=goal();ctx.strokeStyle="rgba(223,216,177,.28)";ctx.lineWidth=1;
    ctx.setLineDash([3,8]);ctx.beginPath();ctx.ellipse(p.x*width,p.y*height,width*.065,height*.022,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="rgba(223,216,177,.56)";ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillText("试着停在这片月光里",p.x*width,p.y*height+Math.max(24,height*.037));
  }
  const drawStar=(p:Point)=>{
    const size=clamp(.6+(p.y-.65)*3,.55,1.12),x=p.x*width,y=p.y*height;
    ctx.fillStyle="#eef4df";ctx.shadowColor="#d7e9ee";ctx.shadowBlur=13*size;
    ctx.beginPath();ctx.moveTo(x,y-7*size);ctx.lineTo(x+2*size,y-2*size);ctx.lineTo(x+7*size,y);ctx.lineTo(x+2*size,y+2*size);ctx.lineTo(x,y+7*size);ctx.lineTo(x-2*size,y+2*size);ctx.lineTo(x-7*size,y);ctx.lineTo(x-2*size,y-2*size);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  };
  function drawRings(now:number) {
    rings=rings.filter(r=>now-r.at<2100);
    for(const ring of rings){
      const t=Math.max(0,(now-ring.at)/2100),x=ring.x*width,y=ring.y*height;
      // 先与水面接触，再展开透明波纹；远处的落点更小。
      if(t<.075){ctx.fillStyle=`rgba(232,240,229,${(1-t/.075)*.65})`;ctx.beginPath();ctx.ellipse(x,y,10*ring.scale,2.5*ring.scale,0,0,Math.PI*2);ctx.fill();}
      if(t<.35)for(let i=0;i<8;i++){
        const a=i*Math.PI/4,age=t/.35;
        const dx=Math.cos(a)*age*35*ring.scale,dy=-Math.sin(Math.PI*age)*(8+i%3*4)+Math.sin(a)*age*7;
        ctx.fillStyle=`rgba(202,221,224,${(1-age)*.55})`;ctx.beginPath();ctx.arc(x+dx,y+dy,Math.max(.5,(1-age)*1.3),0,Math.PI*2);ctx.fill();
      }
      for(let band=0;band<3;band++){
        const age=t-band*.075;if(age<=0)continue;const radius=(7+age*Math.min(width*.15,205))*ring.scale;
        ctx.strokeStyle=ring.precise?`rgba(224,214,169,${Math.max(0,(1-t)*(.45-band*.08))})`:`rgba(197,220,225,${Math.max(0,(1-t)*(.34-band*.065))})`;
        ctx.lineWidth=band? .75:1.15;ctx.beginPath();ctx.ellipse(x,y,radius,radius*.22,0,0,Math.PI*2);ctx.stroke();
      }
    }
  }
  const render=(now:number)=>{
    frame=0;clear();drawGoal();
    while(index<plan.length&&now-hopStart>=plan[index].duration*1000){hopStart+=plan[index].duration*1000;const last=index===plan.length-1;rings.push({...plan[index].to,at:hopStart,scale:1-index*.09,precise:throws>0&&last&&landingMatches(plan[index].to,goal())});index++;}
    drawRings(now);
    if(index<plan.length){const p=pointOnHop(plan[index],(now-hopStart)/(plan[index].duration*1000));trail.push(p);if(trail.length>6)trail.shift();trail.forEach((v,i)=>{ctx.fillStyle=`rgba(202,223,235,${i/trail.length*.13})`;ctx.beginPath();ctx.arc(v.x*width,v.y*height,1,0,Math.PI*2);ctx.fill();});drawStar(p);}
    else if(busy){
      busy=false;restore();trail=[];const precise=throws>0&&landingMatches(plan[plan.length-1].to,goal());throws++;host.dataset.throws=String(throws);host.dataset.landed=precise?"moonlight":"water";
      report(precise?`最后一跳，正好落在月光里。星光跳过了 ${plan.length} 次海面。`:plan.length===1?"轻轻落水，一圈涟漪。横着甩得更快，可以跳得更远。":`这颗星，跳过了 ${plan.length} 次海面。再试一次，让最后一跳停在月光落点里。`);
    }
    if(busy||rings.length)frame=requestAnimationFrame(render);else clear();
  };
  const launch=(start:Point,velocity:Point)=>{
    cancelAnimationFrame(frame);cancelAnimationFrame(previewFrame);previewFrame=0;clear();plan=makeSkipPlan(start,velocity);index=0;hopStart=performance.now();rings=[];trail=[];
    if(!motionAllowed()){
      rings=plan.map((hop,i)=>({...hop.to,at:hopStart-650,scale:1-i*.09,precise:false}));drawRings(hopStart);restore();busy=false;
      report(`静态模式：这次投掷落水 ${plan.length} 次。开启 Motion 后可观看完整轨迹。`);return;
    }
    busy=true;button.dataset.flying="true";button.setAttribute("aria-busy","true");report("星光正掠过海面……");frame=requestAnimationFrame(render);
  };
  const preview=()=>{
    previewFrame=0;if(pointer===null||!dragged)return;clear();drawGoal();const last=samples[samples.length-1];if(!last)return;
    const first=makeSkipPlan(last.point,releaseVelocity(samples,last.point,last.time))[0];
    ctx.strokeStyle="rgba(216,230,221,.3)";ctx.lineWidth=1;ctx.setLineDash([2,7]);ctx.beginPath();
    for(let i=0;i<=20;i++){const p=pointOnHop(first,i/20);if(i)ctx.lineTo(p.x*width,p.y*height);else ctx.moveTo(p.x*width,p.y*height);}ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle="rgba(220,229,213,.55)";ctx.beginPath();ctx.ellipse(first.to.x*width,first.to.y*height,11,3,0,0,Math.PI*2);ctx.stroke();
  };
  const announce=()=>window.dispatchEvent(new CustomEvent(PLAY_EVENT,{detail:"star"}));
  button.addEventListener("pointerdown",e=>{if(!e.isPrimary||e.button!==0||busy)return;e.stopPropagation();announce();pointer=e.pointerId;dragged=false;suppressClick=false;origin=local(e);samples=[{point:origin,time:e.timeStamp}];button.setPointerCapture(pointer);button.dataset.dragging="true";},{signal});
  button.addEventListener("pointermove",e=>{
    if(pointer!==e.pointerId)return;e.stopPropagation();const p=local(e),time=e.timeStamp;dragged||=Math.hypot((p.x-origin.x)*width,(p.y-origin.y)*height)>8;samples.push({point:p,time});
    while(samples.length>2&&(time-samples[1].time>150||samples.length>16))samples.shift();
    if(dragged){button.style.left=`${p.x*100}%`;button.style.top=`${p.y*100}%`;if(!previewFrame)previewFrame=requestAnimationFrame(preview);}
  },{signal});
  button.addEventListener("pointerup",e=>{if(pointer!==e.pointerId)return;e.stopPropagation();const end=local(e);pointer=null;button.dataset.dragging="false";if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);if(dragged){suppressClick=true;launch(end,releaseVelocity(samples,end,e.timeStamp));}else restore();},{signal});
  button.addEventListener("click",e=>{e.stopPropagation();if(suppressClick){suppressClick=false;return;}if(busy)return;announce();const r=button.getBoundingClientRect(),h=host.getBoundingClientRect();launch({x:(r.left+r.width/2-h.left)/width,y:(r.top+r.height/2-h.top)/height},{x:-.95,y:.22});},{signal});
  button.addEventListener("pointercancel",cancel,{signal});button.addEventListener("lostpointercapture",()=>{if(pointer!==null)cancel();},{signal});
  host.addEventListener("keydown",e=>{if(e.key==="Escape"){cancel();report("星光回到了原处。");}},{signal});
  window.addEventListener(PLAY_EVENT,e=>{if((e as CustomEvent).detail!=="star")cancel();},{signal});
  const unwatch=watchRest(host,cancel),observer=new ResizeObserver(resize);observer.observe(host);resize();
  return()=>{cancel();abort.abort();observer.disconnect();unwatch();};
}
