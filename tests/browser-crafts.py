"""针对 Pages 真实构建的三种封面精修回归；不绕过输入调用业务函数。"""
import atexit, json, math, os, traceback, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = os.environ.get('TEST_URL', 'http://127.0.0.1:8765/loseyoung-digital-islands/')
OUT = Path(os.environ.get('TEST_OUTPUT', 'outputs/playgrounds')) / 'crafts'
OUT.mkdir(parents=True, exist_ok=True)
checks = []
def ok(message):
    checks.append(message); print('通过：' + message, flush=True)
def report():
    (OUT / 'report.json').write_text(json.dumps({'checks': checks, 'count': len(checks)}, ensure_ascii=False, indent=2), encoding='utf8')
atexit.register(report)
def failure(kind, value, tb):
    (OUT / 'failure.txt').write_text(''.join(traceback.format_exception(kind, value, tb)), encoding='utf8')
    sys.__excepthook__(kind, value, tb)
sys.excepthook = failure

def open_cover(page, kind):
    c = page.locator(f'.playable-cover[data-kind="{kind}"]')
    c.locator('.cover-launch').click()
    c.locator('.craft-lab').wait_for(state='visible')
    page.wait_for_timeout(150)
    return c

def close_cover(c):
    c.get_by_role('button', name='收起', exact=False).click()

def pixels(canvas):
    return canvas.evaluate('(c)=>{const a=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)n+=a[i];return n}')

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--no-sandbox','--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width':1440,'height':1000})
    page = context.new_page(); errors = []; bad = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('response', lambda r: bad.append(r.url) if r.status >= 400 and not r.url.endswith('/favicon.ico') else None)
    page.goto(URL); page.locator('.cover-launch').first.wait_for(state='visible')
    photo = open_cover(page, 'photos'); canvas = photo.locator('canvas'); b = canvas.bounding_box()
    photo.get_by_role('button', name='细笔', exact=True).click()
    assert photo.get_by_role('button', name='细笔', exact=True).get_attribute('aria-pressed') == 'true'
    before = pixels(canvas)
    page.mouse.move(b['x']+b['width']*.15, b['y']+b['height']*.48); page.mouse.down()
    page.mouse.move(b['x']+b['width']*.85, b['y']+b['height']*.55, steps=16); page.mouse.up()
    assert pixels(canvas) < before and int(photo.locator('.photo-percent').inner_text().rstrip('%')) > 0
    photo.get_by_role('button', name='柔光', exact=True).click()
    assert photo.get_by_role('button', name='柔光', exact=True).get_attribute('aria-pressed') == 'true'
    photo.screenshot(path=str(OUT/'photo-brush.png'))
    photo.get_by_role('button', name='显影整幅', exact=True).click()
    assert pixels(canvas) == 0 and photo.locator('.photo-percent').inner_text() == '100%'
    photo.get_by_role('button', name='银盐影调', exact=True).click()
    page.wait_for_function("getComputedStyle(document.querySelector('.photo-print')).filter.includes('grayscale(1)')")
    assert 'grayscale(1)' in photo.locator('.photo-print').evaluate('(el)=>getComputedStyle(el).filter')
    photo.screenshot(path=str(OUT/'photo-silver.png'))
    photo.get_by_role('button', name='重来', exact=True).click(); page.wait_for_timeout(200)
    assert photo.locator('.photo-percent').inner_text() == '00%' and pixels(photo.locator('canvas')) > 0
    close_cover(photo)
    ok('暗房光刷、进度、整幅定影、银盐影调与重置')

    rune = open_cover(page, 'faerie')
    for label in ['月环','星芒','微风']:
        rune.get_by_role('button', name='绘制'+label, exact=True).click()
        assert label in rune.locator('.play-status').inner_text()
    assert rune.locator('.rune-token[data-discovered="true"]').count() == 3
    assert rune.locator('.craft-counter').inner_text() == '03 / 03'
    canvas = rune.locator('canvas'); b = canvas.bounding_box(); cx=b['x']+b['width']*.5;cy=b['y']+b['height']*.48;r=min(b['width'],b['height'])*.2
    page.mouse.move(cx+r,cy);page.mouse.down()
    for i in range(1,49): page.mouse.move(cx+math.cos(i/48*math.pi*2)*r,cy+math.sin(i/48*math.pi*2)*r)
    page.mouse.up()
    assert '手绘共鸣' in rune.get_by_role('button',name='绘制月环',exact=True).inner_text()
    rune.screenshot(path=str(OUT/'rune-collected.png'))
    rune.get_by_role('button',name='重来',exact=True).click();page.wait_for_timeout(200)
    assert rune.locator('.craft-counter').inner_text() == '00 / 03'; close_cover(rune)
    ok('三种施法反馈、共鸣收集、真实手绘与辅助输入区分')

    route = open_cover(page, 'roamisle'); buttons=route.locator('.route-stops button')
    before=buttons.locator('strong').all_text_contents();a=buttons.first.bounding_box();b=buttons.last.bounding_box()
    page.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2);page.mouse.down()
    page.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2,steps=12)
    assert route.locator('.drop-here').count() == 1
    page.mouse.up(); assert buttons.locator('strong').all_text_contents() == before[1:]+before[:1]
    route.get_by_role('button',name='沿途出发',exact=True).click();page.wait_for_timeout(500)
    route.get_by_role('button',name='暂停行进',exact=True).click()
    transform=route.locator('.route-traveller').get_attribute('transform');page.wait_for_timeout(300)
    assert transform == route.locator('.route-traveller').get_attribute('transform')
    route.get_by_role('button',name='继续行进',exact=True).click()
    route.locator('.route-arrival').wait_for(state='visible',timeout=6000)
    assert '已抵达旧城' in route.locator('.play-status').inner_text()
    assert route.locator('.route-stop[data-visited="true"]').count() == 4
    route.screenshot(path=str(OUT/'route-arrived.png'))
    route.get_by_role('button',name='再走一次',exact=True).click();page.wait_for_timeout(150)
    buttons.first.focus();page.keyboard.press('ArrowRight');page.wait_for_timeout(100)
    assert route.locator('.route-lab').get_attribute('data-phase') == 'ready'
    assert route.locator('.route-traveller').get_attribute('visibility') == 'hidden'
    close_cover(route)
    ok('真实拖排提示、暂停/继续、抵达印章及排序取消旧行程')
    assert not errors, errors;assert not bad,bad
    ok('桌面无脚本异常及图片、动态模块资源错误')

    for width in [320,390,768,1050]:
        mobile=browser.new_context(viewport={'width':width,'height':900},is_mobile=True,has_touch=True,device_scale_factor=1)
        m=mobile.new_page();me=[];m.on('pageerror',lambda e:me.append(str(e)));m.goto(URL)
        m.locator('.cover-launch').first.wait_for(state='visible')
        for kind in ['photos','faerie','roamisle']:
            c=open_cover(m,kind)
            assert m.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,kind)
            bounds=c.bounding_box(); toolbar=c.locator('.play-toolbar').bounding_box(); lab=c.locator('.craft-lab').bounding_box()
            assert lab['y'] >= toolbar['y']+toolbar['height']-1,(width,kind,'工具栏遮挡')
            for button in c.locator('.craft-lab button').all():
                r=button.bounding_box(); assert r['x']>=bounds['x'] and r['x']+r['width']<=bounds['x']+bounds['width']+1,(width,kind,'控件溢出')
            if kind=='photos':
                c.get_by_role('button',name='显影整幅',exact=True).tap();assert c.locator('.photo-percent').inner_text()=='100%'
            if kind=='faerie':
                c.get_by_role('button',name='绘制微风',exact=True).tap();assert '微风' in c.locator('.play-status').inner_text()
            if kind=='roamisle':
                c.locator('.route-stops button').first.tap();c.get_by_role('button',name='沿途出发',exact=True).tap();m.wait_for_timeout(300)
            c.screenshot(path=str(OUT/f'{kind}-{width}.png'));close_cover(c)
        assert not me,me;mobile.close();ok(f'{width}px 触屏操作、控件间距与无横向溢出')

    reduced=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
    r=reduced.new_page();r.goto(URL);r.locator('.cover-launch').first.wait_for(state='visible')
    c=open_cover(r,'faerie');c.get_by_role('button',name='绘制月环',exact=True).click();v=pixels(c.locator('canvas'));r.wait_for_timeout(250);assert v==pixels(c.locator('canvas'));close_cover(c)
    c=open_cover(r,'roamisle');c.get_by_role('button',name='沿途出发',exact=True).click();assert '已抵达' in c.locator('.play-status').inner_text();close_cover(c)
    ok('系统减少动态效果保留静态符文与路线结果')
    browser.close()
print('三种封面专项回归全部通过。',flush=True)
