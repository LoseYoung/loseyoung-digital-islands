"""六点瞄准专项：真实输入，包含原有精度检查与保留会话的新语义。"""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
URL=os.environ.get('TEST_URL','http://127.0.0.1:8765/loseyoung-digital-islands/')
OUT=Path(os.environ.get('TEST_OUTPUT','outputs/playgrounds'))/'aim';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def ok(s):
    checks.append(s);(OUT/'report.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf8');print('通过：'+s,flush=True)
def open_range(page):
    c=page.locator('[data-kind="gridwake"]');c.locator('.cover-launch').scroll_into_view_if_needed();c.locator('.cover-launch').click();expect(c.locator('.aim-range')).to_be_visible();return c
def hit(c,n):return c.get_by_role('button',name=f'命中节点 {n}',exact=True)
with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox','--enable-unsafe-swiftshader']);errors=[]
    page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''window.__aimIntervals=new Set();const start=window.setInterval.bind(window),stop=window.clearInterval.bind(window);window.setInterval=(...args)=>{const id=start(...args);window.__aimIntervals.add(id);return id;};window.clearInterval=id=>{window.__aimIntervals.delete(id);stop(id);};''')
    page.goto(URL);c=open_range(page);page.wait_for_timeout(300)
    expect(c.locator('.aim-stat-value').nth(1)).to_have_text('0.00s');assert c.locator('.aim-lamp').count()==6;c.screenshot(path=str(OUT/'desktop-ready.png'));ok('准备状态不计时，六段进度正常')
    f=c.locator('.target-field').bounding_box();page.mouse.click(f['x']+9,f['y']+9)
    for n in range(1,7):
        t=hit(c,n);expect(t).to_be_visible()
        if n==2:
            b=t.bounding_box();t.click(position={'x':b['width']*.85,'y':b['height']*.5})
        else:t.click()
    expect(c.locator('.aim-range')).to_have_attribute('data-phase','complete');expect(c.locator('.play-status')).to_contain_text('空击 1')
    values=c.locator('.aim-result-stat strong').all_text_contents();assert values[1]=='86%' and values[3]=='5 / 6',values;assert re.fullmatch(r'\d+ms',values[2])
    assert c.locator('.aim-lamp[data-hit="center"]').count()==5;c.screenshot(path=str(OUT/'desktop-result.png'))
    before=c.locator('.aim-stat-value').nth(1).inner_text();page.wait_for_timeout(250);assert c.locator('.aim-stat-value').nth(1).inner_text()==before;assert page.evaluate('window.__aimIntervals.size')==0
    ok('中心和边缘命中区分正确，结算后停止计时')
    c.get_by_role('button',name='重来',exact=True).click();expect(hit(c,1)).to_be_visible();expect(c.locator('.aim-stat-value').last).to_have_text('—');hit(c,1).focus()
    for n in range(1,7):expect(hit(c,n)).to_be_focused();page.keyboard.press('Enter')
    expect(c.locator('.aim-results')).to_be_focused();expect(c.locator('.aim-result-note')).to_contain_text('键盘辅助');assert c.locator('.aim-result-stat strong').last.inner_text()=='—';ok('键盘聚焦与辅助输入不伪报精度')
    c.get_by_role('button',name='重来',exact=True).click();hit(c,1).click();c.get_by_role('button',name='收起 Gridwake 的互动').click();expect(c.locator('.cover-launch')).to_be_focused();page.wait_for_timeout(250)
    assert page.evaluate('window.__aimIntervals.size')==0;assert c.locator('.aim-range').count()==1
    c=open_range(page);expect(hit(c,2)).to_be_visible();expect(c.locator('.aim-range')).to_have_attribute('data-interrupted','true');ok('切换靶标时收起停止计时，重开仍在第二靶并标注中断练习')
    c.get_by_role('button',name='重来',exact=True).click();hit(c,1).click();page.evaluate('window.scrollTo({top:0,behavior:"instant"})');expect(c).to_have_attribute('data-running','false');assert page.evaluate('window.__aimIntervals.size')==0;ok('离屏暂停，没有后台计时或进度清空')
    for width in [320,390,768,1050]:
        context=browser.new_context(viewport={'width':width,'height':900},has_touch=True,is_mobile=width<641);m=context.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(URL);mc=open_range(m)
        geometry=mc.evaluate('''el=>{const rect=s=>el.querySelector(s).getBoundingClientRect().toJSON();return{toolbar:rect('.play-toolbar'),hud:rect('.aim-hud')}}''');assert geometry['hud']['y']>=geometry['toolbar']['y']+geometry['toolbar']['height']-1,(width,geometry)
        for n in range(1,7):
            t=hit(mc,n);expect(t).to_be_visible();g=t.evaluate('''el=>({target:el.getBoundingClientRect().toJSON(),field:el.closest('.aim-field').getBoundingClientRect().toJSON()})''');tb,fb=g['target'],g['field']
            assert tb['width']>=44 and tb['height']>=44,(width,n,g)
            assert tb['x']>=fb['x'] and tb['x']+tb['width']<=fb['x']+fb['width'],(width,n,g)
            assert tb['y']>=fb['y'] and tb['y']+tb['height']<=fb['y']+fb['height'],(width,n,g);t.tap()
        expect(mc.locator('.aim-results')).to_be_visible();assert m.evaluate('document.documentElement.scrollWidth<=innerWidth');mc.screenshot(path=str(OUT/f'touch-result-{width}.png'));context.close()
    ok('320/390/768/1050px 目标边界、触屏布局和六点命中')
    reduced=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce');r=reduced.new_page();r.goto(URL);rc=open_range(r)
    for n in range(1,7):hit(rc,n).click()
    expect(rc.locator('.aim-results')).to_be_visible();assert rc.locator('.aim-range').evaluate('(e)=>e.getAnimations({subtree:true}).filter(a=>a.playState==="running").length')==0;ok('减少动态效果时保留玩法，不播放缩放动画')
    assert not errors,errors;ok('专项回归无脚本异常');browser.close()
print('六点瞄准专项回归全部通过。',flush=True)
