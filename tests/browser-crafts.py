"""三种封面精修回归。固定静态产物，操作真实页面，不调用业务函数。"""
import atexit, json, math, os, sys, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL=os.environ.get('TEST_URL','http://127.0.0.1:8765/loseyoung-digital-islands/')
OUT=Path(os.environ.get('TEST_OUTPUT','outputs/playgrounds'))/'crafts';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def save(): (OUT/'report.json').write_text(json.dumps({'checks':checks,'count':len(checks)},ensure_ascii=False,indent=2),encoding='utf8')
atexit.register(save)
def failed(kind,value,tb):
    (OUT/'failure.txt').write_text(''.join(traceback.format_exception(kind,value,tb)),encoding='utf8');sys.__excepthook__(kind,value,tb)
sys.excepthook=failed
def ok(s): checks.append(s);print('通过：'+s,flush=True)
def opened(page,kind):
    c=page.locator(f'.playable-cover[data-kind="{kind}"]');c.locator('.cover-launch').click();expect(c.locator('.craft-lab')).to_be_visible();return c
def alpha(canvas):
    return canvas.evaluate('(c)=>{const a=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)n+=a[i];return n}')
def paint(page,canvas):
    canvas.scroll_into_view_if_needed();b=canvas.bounding_box();x=b['x']+b['width']*.18;y=b['y']+b['height']*.45
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(b['x']+b['width']*.78,y+b['height']*.1,steps=10);page.mouse.up()
def in_bounds(c,selector):
    return c.evaluate('''(el,s)=>{const a=el.getBoundingClientRect();return [...el.querySelectorAll(s)].filter(n=>n.getBoundingClientRect().width).map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,x:r.left-a.left,y:r.top-a.top,w:r.width,h:r.height,cw:a.width,ch:a.height}})}''',selector)
with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];bad=[]
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:bad.append(r.url) if r.status>=400 and not r.url.endswith('/favicon.ico') else None)
    page.goto(URL)
    photo=opened(page,'photos');canvas=photo.locator('.photo-emulsion');before=alpha(canvas)
    photo.get_by_role('button',name='细笔',exact=True).click();paint(page,canvas)
    expect(photo.locator('.play-status')).to_contain_text('已显影');assert 0<int(photo.locator('.photo-percent').inner_text().strip('%'))<100
    assert alpha(canvas)<before;photo.screenshot(path=str(OUT/'photo-brush.png'))
    photo.get_by_role('button',name='显影整幅',exact=True).click();expect(photo.locator('.photo-percent')).to_have_text('100%');assert alpha(canvas)==0
    photo.get_by_role('button',name='银盐影调',exact=True).click();expect(photo.locator('.photo-lab')).to_have_attribute('data-tone','silver')
    photo.screenshot(path=str(OUT/'photo-silver.png'))
    photo.get_by_role('button',name='重来',exact=True).click();expect(photo.locator('.photo-percent')).to_have_text('00%');assert alpha(canvas)>0
    ok('暗房光刷、进度、整幅定影、银盐影调与重置')
    rune=opened(page,'faerie')
    for kind,text in [('moon','月环'),('spark','星芒'),('breeze','微风')]:
        rune.get_by_role('button',name='绘制'+text,exact=True).click();expect(rune.locator('.rune-lab')).to_have_attribute('data-rune',kind);expect(rune.locator('.play-status')).to_contain_text(text)
    assert rune.locator('.rune-token[data-discovered="true"]').count()==3;expect(rune.locator('.craft-counter')).to_have_text('03 / 03')
    rune.screenshot(path=str(OUT/'rune-collected.png'))
    # 先把真实画布置于可操作视口，避免上一个按钮的原生焦点滚动使笔画落在工具栏上。
    canvas=rune.locator('.rune-canvas');canvas.scroll_into_view_if_needed();expect(canvas).to_be_in_viewport(ratio=1)
    page.wait_for_timeout(180)
    b=canvas.bounding_box();cx=b['x']+b['width']/2;cy=b['y']+b['height']*.48;rad=min(b['width'],b['height'])*.20
    topmost=page.evaluate('''p=>{const e=document.elementFromPoint(p.x,p.y);return {canvas:e?.classList.contains('rune-canvas'),tag:e?.tagName,cls:e?.className}}''',{'x':cx+rad,'y':cy})
    assert topmost['canvas'],topmost
    page.mouse.move(cx+rad,cy);page.mouse.down()
    for i in range(1,41):page.mouse.move(cx+math.cos(i/40*math.pi*2)*rad,cy+math.sin(i/40*math.pi*2)*rad)
    page.mouse.up()
    try:expect(rune.get_by_role('button',name='绘制月环',exact=True)).to_contain_text('手绘共鸣')
    except Exception:
        page.screenshot(path=str(OUT/'rune-input-failure.png'))
        print('手绘诊断：',rune.locator('.play-status').inner_text(),rune.get_attribute('data-running'),canvas.bounding_box(),flush=True);raise
    rune.get_by_role('button',name='绘制月环',exact=True).click();assert '手绘共鸣' in rune.get_by_role('button',name='绘制月环',exact=True).inner_text()
    ok('三种施法反馈、共鸣收集、真实手绘与辅助输入区分')
    route=opened(page,'roamisle');buttons=route.locator('.route-stop');old=buttons.all_text_contents()
    a=buttons.first.bounding_box();b=buttons.last.bounding_box()
    page.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2);page.mouse.down();page.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2,steps=10)
    assert route.locator('.route-stop.drop-here').count()==1;page.mouse.up();assert buttons.all_text_contents()!=old
    route.get_by_role('button',name='沿途出发',exact=True).click();page.wait_for_timeout(400);route.get_by_role('button',name='暂停行进',exact=True).click()
    expect(route.locator('.route-lab')).to_have_attribute('data-phase','paused');position=route.locator('.route-traveller').get_attribute('transform');page.wait_for_timeout(250)
    assert position==route.locator('.route-traveller').get_attribute('transform')
    route.get_by_role('button',name='继续行进',exact=True).click();route.locator('.route-arrival').wait_for(state='visible',timeout=6000)
    expect(route.locator('.craft-counter')).to_have_text('04 / 04');assert route.locator('.route-stop[data-visited="true"]').count()==4
    route.screenshot(path=str(OUT/'route-arrived.png'))
    buttons.first.focus();page.keyboard.press('ArrowRight');expect(route.locator('.route-lab')).to_have_attribute('data-phase','ready');expect(route.locator('.route-arrival')).to_be_hidden()
    ok('真实拖排提示、暂停/继续、抵达印章及排序取消旧行程')
    assert not errors,errors;assert not bad,bad;ok('桌面无脚本异常及图片、动态模块资源错误')
    for width in [320,390,768,1050]:
        context=browser.new_context(viewport={'width':width,'height':950},is_mobile=width<=640,has_touch=True,device_scale_factor=1)
        m=context.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(URL)
        for kind in ['photos','faerie','roamisle']:
            c=opened(m,kind);assert m.evaluate('document.documentElement.scrollWidth<=innerWidth')
            geometry=c.evaluate('''el=>({bar:el.querySelector('.play-toolbar').getBoundingClientRect().toJSON(),head:el.querySelector('.craft-head').getBoundingClientRect().toJSON(),status:el.querySelector('.play-status').getBoundingClientRect().toJSON(),lab:el.querySelector('.craft-lab').getBoundingClientRect().toJSON()})''')
            assert geometry['head']['top']>=geometry['bar']['bottom']-1,(width,kind,geometry)
            assert geometry['lab']['bottom']<=geometry['status']['top']+15,(width,kind,geometry)
            for r in in_bounds(c,'.craft-button,.rune-token,.route-stop'):
                assert r['x']>=-1 and r['x']+r['w']<=r['cw']+1,(width,kind,r)
                assert r['y']>=0 and r['y']+r['h']<=r['ch'],(width,kind,r)
            if kind=='photos':c.get_by_role('button',name='显影整幅',exact=True).tap();expect(c.locator('.photo-percent')).to_have_text('100%')
            elif kind=='faerie':c.get_by_role('button',name='绘制微风',exact=True).tap();expect(c.locator('.rune-lab')).to_have_attribute('data-rune','breeze')
            else:c.locator('.route-stop').first.tap();c.get_by_role('button',name='沿途出发',exact=True).tap();c.get_by_role('button',name='暂停行进',exact=True).tap()
            c.screenshot(path=str(OUT/f'{kind}-{width}.png'));c.get_by_role('button',name='收起',exact=False).tap()
        context.close();ok(f'{width}px 触屏操作、控件间距与无横向溢出')
    reduced=browser.new_context(viewport={'width':1280,'height':950},reduced_motion='reduce');r=reduced.new_page();r.goto(URL)
    rc=opened(r,'faerie');rc.get_by_role('button',name='绘制星芒',exact=True).click();a=alpha(rc.locator('canvas'));r.wait_for_timeout(220);assert a==alpha(rc.locator('canvas'))
    rr=opened(r,'roamisle');rr.get_by_role('button',name='沿途出发',exact=True).click();expect(rr.locator('.route-arrival')).to_be_visible();expect(rr.locator('.craft-counter')).to_have_text('04 / 04')
    assert not errors,errors;ok('系统减少动态效果保留静态符文与路线结果');browser.close()
print('三座岛屿精修专项回归全部通过。',flush=True)
