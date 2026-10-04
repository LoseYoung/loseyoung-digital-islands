"""IJ-01：真实 UI 回归，验证继续、组合、结尾及同题比较；不直接调用游戏引擎。"""
import atexit, json, os, re, sys, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
URL=os.environ.get('TEST_URL','http://127.0.0.1:8765/loseyoung-digital-islands/')
OUT=Path(os.environ.get('TEST_OUTPUT','outputs/playgrounds'))/'journeys'; OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def ok(s): checks.append(s); print('通过：'+s,flush=True)
def save(): (OUT/'report.json').write_text(json.dumps({'checks':checks,'count':len(checks)},ensure_ascii=False,indent=2),encoding='utf8')
atexit.register(save)
def failure(t,v,tb):
 (OUT/'failure.txt').write_text(''.join(traceback.format_exception(t,v,tb)),encoding='utf8');sys.__excepthook__(t,v,tb)
sys.excepthook=failure

def open_cover(page,kind):
 c=page.locator(f'.playable-cover[data-kind="{kind}"]');c.locator('.cover-launch').click()
 expect(c.locator('.cover-engine > :first-child')).to_be_visible();page.wait_for_timeout(150);return c

def close(c):c.get_by_role('button',name='收起',exact=False).click()
def hit(c,i):c.get_by_role('button',name=f'命中节点 {i}',exact=True).click()
def pixels(c):return c.evaluate('(c)=>{const a=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)n+=a[i];return n}')
def motion(page,value):page.evaluate('(v)=>document.documentElement.dataset.motion=v',value);page.wait_for_timeout(80)

with sync_playwright() as p:
 launch={'args':['--no-sandbox','--enable-unsafe-swiftshader']}
 if os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'):launch['executable_path']=os.environ['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
 browser=p.chromium.launch(**launch)
 ctx=browser.new_context(viewport={'width':1440,'height':1000});page=ctx.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('''window.__intervals=new Set();const si=window.setInterval,ci=window.clearInterval;window.setInterval=(...a)=>{const id=si(...a);__intervals.add(id);return id};window.clearInterval=id=>{__intervals.delete(id);ci(id)};''')
 page.goto(URL);page.locator('.cover-launch').first.wait_for(state='visible')
 c=open_cover(page,'photos');canvas=c.locator('canvas');canvas.evaluate('el=>window.__photo=el');r=canvas.bounding_box()
 original=pixels(canvas)
 page.mouse.move(r['x']+r['width']*.2,r['y']+r['height']*.45);page.mouse.down();page.mouse.move(r['x']+r['width']*.8,r['y']+r['height']*.6,steps=16);page.mouse.up()
 part=pixels(canvas);assert 0<part<original
 c.get_by_role('button',name='就这样定影',exact=True).click();expect(c.locator('.photo-lab')).to_have_attribute('data-complete','true')
 assert pixels(canvas)==part
 close(c);c=open_cover(page,'photos');assert canvas.evaluate('el=>el===window.__photo') and pixels(canvas)==part
 c.get_by_role('button',name='撤销一笔',exact=True).click();assert pixels(canvas)==original
 c.get_by_label('添加自选底片').set_input_files('public/photos-island.png')
 expect(c.get_by_role('combobox',name='选择底片')).to_have_value('1')
 c.get_by_role('combobox',name='选择底片').select_option('0');assert pixels(canvas)==original
 ok('暗房部分构图可以定影；收起保留相纸，撤销恢复前一笔')
 c.get_by_role('button',name='展开',exact=True).click();expect(c.locator('dialog')).to_have_js_property('open',True)
 assert c.locator('dialog').evaluate('el=>el.matches(":modal")')
 assert canvas.evaluate('el=>el===window.__photo')
 page.keyboard.press('Escape');assert not c.locator('dialog').evaluate('el=>el.matches(":modal")')
 expect(c).to_have_attribute('data-playing','true');close(c)
 ok('展开使用同一个画布，Esc 回到封面，退出恢复原入口焦点')
 c=open_cover(page,'faerie')
 for spell in ['月环','微风','星芒']:c.get_by_role('button',name='绘制'+spell).click()
 expect(c.locator('.rune-lab')).to_have_attribute('data-forest','lit');close(c)
 c=open_cover(page,'faerie');expect(c.locator('.rune-lab')).to_have_attribute('data-forest','lit')
 for spell in ['月环','星芒','微风']:c.get_by_role('button',name='绘制'+spell).click()
 expect(c.locator('.rune-lab')).to_have_attribute('data-forest','seeds')
 motion(page,'off');expect(c).to_have_attribute('data-playing','true')
 expect(c.locator('.rune-lab')).to_have_attribute('data-forest','seeds')
 c.screenshot(path=str(OUT/'forest-seeds.png'));motion(page,'on');close(c)
 ok('符文先后顺序产生两种持久场景，关闭动效不清空共鸣')
 c=open_cover(page,'roamisle');c.get_by_role('button',name='沿途出发',exact=True).click();page.wait_for_timeout(400)
 page.evaluate('Object.defineProperty(document,"hidden",{value:true,configurable:true});document.dispatchEvent(new Event("visibilitychange"))')
 expect(c).to_have_attribute('data-playing','false')
 before=c.locator('.route-traveller').get_attribute('transform');page.wait_for_timeout(300)
 assert before==c.locator('.route-traveller').get_attribute('transform')
 page.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))')
 c=open_cover(page,'roamisle');expect(c.locator('.route-lab')).to_have_attribute('data-phase','paused')
 assert before==c.locator('.route-traveller').get_attribute('transform')
 c.get_by_role('button',name='继续行进',exact=True).click();c.locator('.route-arrival').wait_for(state='visible',timeout=6000)
 ok('后台暂停不丢路线和途中位置，返回后手动继续而不是重启')
 c.get_by_role('button',name='赶在月落之前',exact=True).click();motion(page,'off')
 c.get_by_role('button',name='沿途出发',exact=True).click();expect(c.locator('.route-lab')).to_have_attribute('data-ending','delivered')
 c.locator('.route-stops button').nth(1).focus();page.keyboard.press('ArrowRight')
 c.get_by_role('button',name='沿途出发',exact=True).click();expect(c.locator('.route-lab')).to_have_attribute('data-ending','late')
 c.screenshot(path=str(OUT/'after-moonset.png'))
 c.locator('.route-stops button').nth(3).focus();page.keyboard.press('ArrowLeft')
 c.get_by_role('button',name='沿途出发',exact=True).click();expect(c.locator('.route-lab')).to_have_attribute('data-ending','elsewhere')
 motion(page,'on');close(c)
 ok('真实键盘重排得到按时、迟到和别处停靠三种结尾，规则可查')
 c=open_cover(page,'gridwake');first=c.locator('.aim-target').evaluate('el=>[el.style.left,el.style.top]')
 for i in range(1,7):hit(c,i)
 c.get_by_role('button',name='同题再试',exact=True).click();assert first==c.locator('.aim-target').evaluate('el=>[el.style.left,el.style.top]')
 for i in range(1,7):hit(c,i)
 expect(c.locator('.aim-comparison')).to_contain_text('比上一局');assert c.locator('.aim-splits span').count()==6
 c.screenshot(path=str(OUT/'aim-comparison.png'))
 ok('同题保留六个目标位置，并展示同规格两轮的总差值和分靶差值')
 c.get_by_role('button',name='同题再试',exact=True).click();hit(c,1);close(c)
 assert page.evaluate('__intervals.size')==0
 c=open_cover(page,'gridwake')
 for i in range(2,7):hit(c,i)
 expect(c.locator('.aim-result-note')).to_contain_text('中断练习')
 assert '比上一局' not in c.locator('.aim-comparison').inner_text()
 page.evaluate('Object.defineProperty(navigator,"clipboard",{value:{writeText:()=>Promise.reject(new Error("denied"))},configurable:true})')
 c.get_by_role('button',name='复制挑战链接',exact=True).click();inp=c.get_by_role('textbox',name='手动复制挑战链接');expect(inp).to_be_visible();link=inp.input_value()
 assert re.search(r'[?&]aim=\d+',link)
 n=ctx.new_page();n.goto(link);nc=open_cover(n,'gridwake');assert first==nc.locator('.aim-target').evaluate('el=>[el.style.left,el.style.top]');n.close()
 close(c);ok('中断回合不参与比较；剪贴板拒绝时可手动复制，链接种子可复现')
 for _ in range(6):c=open_cover(page,'photos');assert c.locator('canvas').evaluate('el=>el===window.__photo');close(c)
 assert page.evaluate('__intervals.size')==0
 assert page.locator('.photo-lab').count()==1 and page.locator('.aim-range').count()==1
 ok('反复收起/继续不重复挂载引擎，不残留计时器')
 # 记录 CI 环境下的 rAF 间隔，不把软件 GPU 的数值当作真实用户设备 FPS。
 timings=page.evaluate('''()=>new Promise(resolve=>{let last=0;const samples=[];function tick(now){if(last)samples.push(now-last);last=now;if(samples.length<40)requestAnimationFrame(tick);else resolve(samples)}requestAnimationFrame(tick)})''')
 timings.sort();(OUT/'frame-observation.json').write_text(json.dumps({'environment':'CI Chromium; not hardware FPS','idleRAFMedianMs':timings[len(timings)//2],'idleRAFP95Ms':timings[int(len(timings)*.95)]},indent=2))
 assert not errors,errors
 for width in [320,390,768,1050]:
  mobile=browser.new_context(viewport={'width':width,'height':900},has_touch=True,is_mobile=width<641)
  m=mobile.new_page();m.goto(URL)
  for kind in ['photos','faerie','roamisle','gridwake']:
   c=open_cover(m,kind);c.get_by_role('button',name='展开',exact=True).tap()
   assert c.locator('dialog').evaluate('el=>el.matches(":modal")')
   assert m.evaluate('document.documentElement.scrollWidth<=innerWidth')
   for button in c.locator('dialog button:visible').all():
    rect=button.bounding_box();assert rect['x']>=0 and rect['x']+rect['width']<=width+1,(width,kind,rect)
   c.locator('dialog').screenshot(path=str(OUT/f'{kind}-expanded-{width}.png'))
   c.get_by_role('button',name='回到封面',exact=True).tap();close(c)
  mobile.close();ok(f'{width}px 四种展开游玩不溢出，触屏可正常退出')
 browser.close()
print('交互叙事专项回归全部通过。',flush=True)
