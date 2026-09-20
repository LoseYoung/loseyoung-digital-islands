import json, math, os
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = os.environ.get('TEST_URL','http://127.0.0.1:8765/loseyoung-digital-islands/')
OUT = Path(os.environ.get('TEST_OUTPUT','outputs/playgrounds')); OUT.mkdir(parents=True,exist_ok=True)
results=[]
def ok(s): results.append(s); print('通过：'+s, flush=True)
def cover(page, kind): return page.locator(f'.playable-cover[data-kind="{kind}"]')
def open_cover(page, kind):
    c=cover(page,kind); c.locator('.cover-launch').scroll_into_view_if_needed(); c.locator('.cover-launch').click()
    c.locator('.cover-engine > :first-child').wait_for(state='visible'); page.wait_for_timeout(100)
    assert c.get_attribute('data-playing')=='true'
    return c

def pixels(page, selector):
    return page.locator(selector).evaluate('(c)=>{const a=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let s=0;for(let i=3;i<a.length;i+=4)s+=a[i];return s}')

with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox','--enable-unsafe-swiftshader'])
    ctx=browser.new_context(viewport={'width':1440,'height':1000}, device_scale_factor=1)
    page=ctx.new_page(); errors=[]; bad=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:bad.append(r.url) if r.status>=400 and not r.url.endswith('/favicon.ico') else None)
    page.goto(URL); page.locator('.throw-star').wait_for(state='visible'); page.wait_for_timeout(1600)
    assert page.locator('.island-entry').count()==4
    assert page.locator('.cover-launch').count()==4
    page.screenshot(path=str(OUT/'desktop-hero.png'))
    ok('默认静态封面、四个独立启动按钮与首屏星光')
    star=page.locator('.throw-star'); star.click(); page.wait_for_timeout(950)
    assert pixels(page,'.star-canvas')>0
    page.screenshot(path=str(OUT/'star-impact.png'))
    page.wait_for_timeout(2000)
    assert '次海面' in page.locator('.star-feedback').inner_text()
    ok('点击星光后出现真实轨迹、多个落点和结果')
    # 轻放：停住再松手，不把早期拖动速度误算成投掷速度。
    box=star.bounding_box(); x=box['x']+box['width']/2; y=box['y']+box['height']/2
    page.mouse.move(x,y); page.mouse.down(); page.mouse.move(x-120,y+220,steps=8); page.wait_for_timeout(250); page.mouse.up(); page.wait_for_timeout(850)
    assert '一圈涟漪' in page.locator('.star-feedback').inner_text()
    ok('拖住后停下轻放只落水一次')
    # 甩出。
    box=star.bounding_box(); x=box['x']+box['width']/2; y=box['y']+box['height']/2
    page.mouse.move(x,y); page.mouse.down(); page.mouse.move(x-100,y+200,steps=5); page.mouse.move(x-380,y+230,steps=5); page.mouse.up(); page.wait_for_timeout(2900)
    assert '次海面' in page.locator('.star-feedback').inner_text()
    ok('横向快速甩出不同于轻放')
    star.focus(); page.keyboard.press('Enter'); page.wait_for_timeout(150); page.keyboard.press('Escape')
    assert pixels(page,'.star-canvas')==0
    ok('键盘投掷与 Esc 中止')
    photo=open_cover(page,'photos'); canvas=photo.locator('canvas'); before=pixels(page,'[data-kind="photos"] canvas')
    b=canvas.bounding_box(); page.mouse.move(b['x']+b['width']*.2,b['y']+b['height']*.42);page.mouse.down()
    page.mouse.move(b['x']+b['width']*.75,b['y']+b['height']*.55,steps=15);page.mouse.up()
    assert pixels(page,'[data-kind="photos"] canvas')<before
    assert '已显影' in photo.locator('.play-status').inner_text()
    page.screenshot(path=str(OUT/'photo-reveal.png'))
    photo.get_by_role('button',name='显影整幅').click(); assert pixels(page,'[data-kind="photos"] canvas')==0
    photo.get_by_role('button',name='重来',exact=True).click();page.wait_for_timeout(100)
    assert pixels(page,'[data-kind="photos"] canvas')>0
    photo.get_by_role('button',name='收起 Photos Island 的互动').click();page.wait_for_timeout(50)
    assert page.evaluate('document.activeElement.classList.contains("cover-launch")')
    ok('手绘显影、完整显影、重置与收起焦点恢复')
    faerie=open_cover(page,'faerie'); cb=faerie.locator('canvas').bounding_box();cx=cb['x']+cb['width']*.5;cy=cb['y']+cb['height']*.44;r=min(cb['width'],cb['height'])*.18
    page.mouse.move(cx+r,cy);page.mouse.down()
    for i in range(1,49):page.mouse.move(cx+math.cos(i/48*math.pi*2)*r,cy+math.sin(i/48*math.pi*2)*r)
    page.mouse.up();assert '月环' in faerie.locator('.play-status').inner_text()
    page.wait_for_timeout(200);page.screenshot(path=str(OUT/'faerie-rune.png'))
    faerie.get_by_role('button',name='绘制星芒').click();assert '星芒' in faerie.locator('.play-status').inner_text()
    ok('真实绘制圆环与按钮星芒触发不同反馈')
    grid=open_cover(page,'gridwake');f=grid.locator('.target-field').bounding_box();page.mouse.click(f['x']+10,f['y']+10)
    for i in range(6):grid.get_by_role('button',name=f'命中节点 {i+1}',exact=True).click()
    assert '六个节点已点亮' in grid.locator('.play-status').inner_text()
    assert '空击 1' in grid.locator('.play-status').inner_text()
    page.screenshot(path=str(OUT/'gridwake-finished.png'))
    ok('六目标瞄准命中、空击与完成计时')
    route=open_cover(page,'roamisle');line=route.locator('.route-line');original=line.get_attribute('points')
    route.locator('.route-stops button').first.focus();page.keyboard.press('ArrowRight');assert line.get_attribute('points')!=original
    labels=route.locator('.route-stops button').all_text_contents()
    b1=route.locator('.route-stops button').first.bounding_box();b4=route.locator('.route-stops button').nth(3).bounding_box()
    page.mouse.move(b1['x']+b1['width']/2,b1['y']+b1['height']/2);page.mouse.down();page.mouse.move(b4['x']+b4['width']/2,b4['y']+b4['height']/2,steps=14);page.mouse.up()
    assert route.locator('.route-stops button').all_text_contents()!=labels
    route.get_by_role('button',name='沿途出发').click();page.wait_for_timeout(1300);page.screenshot(path=str(OUT/'roamisle-route.png'));page.wait_for_timeout(3200)
    assert '已抵达' in route.locator('.play-status').inner_text()
    ok('路线键盘排序、真实拖拽排序和沿路径运行')
    page.evaluate('window.scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(200)
    assert page.locator('.playable-cover[data-playing="true"]').count()==0
    ok('离屏自动退出并清理实验')
    page.locator('.motion-toggle').click();page.wait_for_timeout(100)
    star.click();assert '静态模式' in page.locator('.star-feedback').inner_text()
    a=pixels(page,'.star-canvas');page.wait_for_timeout(250);assert a==pixels(page,'.star-canvas')
    ok('Motion off 后为静态反馈，不运行投掷动画')
    page.locator('.motion-toggle').click();page.wait_for_timeout(100);star.click();page.wait_for_timeout(150)
    page.evaluate('Object.defineProperty(document,"hidden",{value:true,configurable:true});document.dispatchEvent(new Event("visibilitychange"))')
    assert pixels(page,'.star-canvas')==0
    page.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))')
    ok('后台事件清理飞行画布')
    assert not errors, errors; assert not bad,bad
    ok('桌面无脚本异常和资源加载错误')
    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
    m=mobile.new_page();mobileerrors=[];m.on('pageerror',lambda e:mobileerrors.append(str(e)));m.goto(URL);m.locator('.throw-star').wait_for(state='visible');m.wait_for_timeout(1600)
    m.screenshot(path=str(OUT/'mobile-hero.png'))
    m.locator('.throw-star').tap();m.wait_for_timeout(2800);assert '次海面' in m.locator('.star-feedback').inner_text()
    for kind in ['photos','faerie','gridwake','roamisle']:
      c=open_cover(m,kind)
      assert m.evaluate('document.documentElement.scrollWidth <= innerWidth'),kind
      if kind=='photos':c.get_by_role('button',name='显影整幅').tap()
      if kind=='faerie':c.get_by_role('button',name='绘制月环').tap()
      if kind=='gridwake':
        for i in range(6):c.get_by_role('button',name=f'命中节点 {i+1}',exact=True).tap()
      if kind=='roamisle':c.locator('.route-stops button').first.tap();c.get_by_role('button',name='沿途出发').tap()
      m.screenshot(path=str(OUT/f'mobile-{kind}.png'))
      c.get_by_role('button',name='收起',exact=False).tap()
    assert not mobileerrors,mobileerrors
    ok('手机四种实验可操作、可关闭且无横向溢出')
    reduced=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce');r=reduced.new_page();r.goto(URL);r.locator('.throw-star').wait_for(state='visible');r.locator('.throw-star').click()
    assert '静态模式' in r.locator('.star-feedback').inner_text()
    rc=open_cover(r,'faerie');rc.get_by_role('button',name='绘制月环').click()
    a=pixels(r,'[data-kind="faerie"] canvas');r.wait_for_timeout(250);assert a==pixels(r,'[data-kind="faerie"] canvas')
    ok('系统减少动态效果下主动操作保留静态符文和投掷结果')
    nojs=browser.new_context(java_script_enabled=False,viewport={'width':1440,'height':1000});n=nojs.new_page();n.goto(URL)
    assert n.locator('.cover-launch:visible').count()==0 and n.locator('.throw-star:visible').count()==0
    assert n.locator('.cover-still').count()==4
    assert n.locator('.island-caption[href^="https:"]').count()==4
    ok('无 JavaScript 时没有死按钮，四个作品仍可直接进入')
    browser.close()
(OUT/'report.json').write_text(json.dumps({'checks':results,'count':len(results)},ensure_ascii=False,indent=2))
print('全部浏览器回归通过。',flush=True)
