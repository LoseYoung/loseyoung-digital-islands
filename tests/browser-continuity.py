"""连续体验专项：只通过界面完成玩法，配置/可见性事件另行模拟。"""
import atexit, json, os, traceback, sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL=os.environ.get('TEST_URL','http://127.0.0.1:8765/loseyoung-digital-islands/')
OUT=Path(os.environ.get('TEST_OUTPUT','outputs/playgrounds'))/'continuity';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def ok(text):checks.append(text);print('通过：'+text,flush=True)
def save(): (OUT/'report.json').write_text(json.dumps({'checks':checks,'count':len(checks)},ensure_ascii=False,indent=2),encoding='utf8')
atexit.register(save)
def error(kind,value,tb):
    (OUT/'failure.txt').write_text(''.join(traceback.format_exception(kind,value,tb)),encoding='utf8');sys.__excepthook__(kind,value,tb)
sys.excepthook=error

def open_cover(page,kind):
    c=page.locator(f'.playable-cover[data-kind="{kind}"]');c.locator('.cover-launch').click();expect(c.locator('.cover-engine > :first-child')).to_be_visible();return c

def alpha(canvas):return canvas.evaluate('(c)=>{const a=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let s=0;for(let i=3;i<a.length;i+=4)s+=a[i];return s}')
def line(page,canvas,dy=0):
    b=canvas.bounding_box();page.mouse.move(b['x']+b['width']*.2,b['y']+b['height']*(.42+dy));page.mouse.down();page.mouse.move(b['x']+b['width']*.78,b['y']+b['height']*(.52+dy),steps=12);page.mouse.up()
def close(c):c.get_by_role('button',name='收起',exact=False).click()
def hit(c,n):return c.get_by_role('button',name=f'命中节点 {n}',exact=True)

with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox','--enable-unsafe-swiftshader'])
    context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL)
    photo=open_cover(page,'photos');canvas=photo.locator('canvas');original=alpha(canvas);line(page,canvas)
    first=alpha(canvas);assert 0<first<original;line(page,canvas,.22);second=alpha(canvas);assert second<first
    photo.get_by_role('button',name='撤销一笔',exact=True).click();assert alpha(canvas)==first
    photo.get_by_role('button',name='定影',exact=True).click();assert alpha(canvas)==first;expect(photo.locator('.photo-lab')).to_have_attribute('data-complete','true')
    photo.screenshot(path=str(OUT/'partial-print.png'));ok('连续笔迹可逐笔撤销，局部定影不自动擦去留白')
    with page.expect_download() as event:photo.get_by_role('button',name='保存作品',exact=True).click()
    download=event.value;download.save_as(str(OUT/'light-study.png'));assert (OUT/'light-study.png').read_bytes().startswith(b'\x89PNG')
    ok('局部作品在浏览器中生成可用 PNG，无上传服务')
    close(photo);photo=open_cover(page,'photos');assert alpha(photo.locator('canvas'))==first
    photo.get_by_role('button',name='水光',exact=True).click();assert alpha(photo.locator('canvas'))==original
    photo.get_by_role('button',name='全景',exact=True).click();assert alpha(photo.locator('canvas'))==first;ok('收起和取景切换均保留各自的笔迹与定影状态')
    photo.get_by_role('button',name='展开游玩',exact=True).click();expect(photo.locator('dialog')).to_have_attribute('data-expanded','true')
    assert photo.locator('dialog').evaluate('(el)=>el.matches(":modal")');assert alpha(photo.locator('canvas'))==first
    photo.screenshot(path=str(OUT/'expanded-print.png'));page.keyboard.press('Escape');expect(photo.locator('dialog')).to_have_attribute('data-expanded','false');assert alpha(photo.locator('canvas'))==first;close(photo)
    ok('原生模态展开、Esc 返回与画面状态连续')

    rune=open_cover(page,'faerie')
    for spell in ['月环','微风','星芒']:rune.get_by_role('button',name='绘制'+spell,exact=True).click()
    expect(rune.locator('.rune-lab')).to_have_attribute('data-forest','awakened');page.wait_for_timeout(1700);rune.screenshot(path=str(OUT/'forest-awakened.png'))
    close(rune);rune=open_cover(page,'faerie');expect(rune.locator('.rune-lab')).to_have_attribute('data-forest','awakened')
    rune.get_by_role('button',name='清空法阵',exact=True).click()
    for spell in ['月环','星芒','微风']:rune.get_by_role('button',name='绘制'+spell,exact=True).click()
    expect(rune.locator('.rune-lab')).to_have_attribute('data-forest','drifting');assert rune.locator('.rune-token[data-discovered="true"]').count()==3
    page.wait_for_timeout(1700);rune.screenshot(path=str(OUT/'forest-drifting.png'));ok('相同三种符文因顺序产生石门与漂移星座两种持久结果')
    page.evaluate('document.documentElement.dataset.motion="off"');page.wait_for_timeout(100)
    expect(rune).to_have_attribute('data-playing','true');expect(rune.locator('.rune-lab')).to_have_attribute('data-forest','drifting')
    rune.get_by_role('button',name='绘制月环',exact=True).click();a=alpha(rune.locator('canvas'));page.wait_for_timeout(250);assert alpha(rune.locator('canvas'))==a
    ok('关闭动效不关闭玩法、不清空已收集记录');close(rune)

    route=open_cover(page,'roamisle');route.get_by_role('button',name='赶在月落前',exact=True).click();route.get_by_role('button',name='沿途出发',exact=True).click()
    expect(route.locator('.route-lab')).to_have_attribute('data-ending','letter');expect(route.locator('.route-arrival')).to_contain_text('月落前的回信');route.screenshot(path=str(OUT/'route-before-moonset.png'))
    route.locator('.route-stops button').first.focus();page.keyboard.press('ArrowRight');route.get_by_role('button',name='沿途出发',exact=True).click()
    expect(route.locator('.route-lab')).to_have_attribute('data-ending','watch');expect(route.locator('.route-arrival')).to_contain_text('守夜人的灯');ok('按相同规则重排路线会错过渡船并产生不同结尾')
    page.evaluate('document.documentElement.dataset.motion="on"');route.get_by_role('button',name='自由漫游',exact=True).click();route.get_by_role('button',name='沿途出发',exact=True).click();page.wait_for_timeout(400)
    page.evaluate('Object.defineProperty(document,"hidden",{value:true,configurable:true});document.dispatchEvent(new Event("visibilitychange"))');expect(route).to_have_attribute('data-running','false')
    position=route.locator('.route-traveller').get_attribute('transform');page.wait_for_timeout(400);assert route.locator('.route-traveller').get_attribute('transform')==position
    page.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');route.get_by_role('button',name='继续本轮',exact=True).click()
    route.locator('.route-arrival').wait_for(state='visible',timeout=6000);expect(route.locator('.craft-counter')).to_have_text('04 / 04');close(route);ok('后台停止行进，恢复后从暂停位置继续而不是重新开始')

    grid=open_cover(page,'gridwake');seed=grid.locator('.aim-range').get_attribute('data-seed')
    positions=[]
    for i in range(1,7):
        t=hit(grid,i);expect(t).to_be_visible();positions.append(t.get_attribute('style'));t.click()
    grid.get_by_role('button',name='同组再来',exact=True).click()
    for i in range(1,7):
        t=hit(grid,i);expect(t).to_be_visible();assert t.get_attribute('style')==positions[i-1];t.click()
    expect(grid.locator('.aim-result-note')).to_contain_text('对比上一轮');assert grid.locator('.aim-splits span').count()==6;grid.screenshot(path=str(OUT/'aim-comparison.png'))
    ok('同组重练保持六靶序列且生成逐靶与总用时对比')
    grid.get_by_role('button',name='同组再来',exact=True).click();hit(grid,1).click();close(grid);grid=open_cover(page,'gridwake')
    for i in range(2,7):hit(grid,i).click()
    expect(grid.locator('.aim-result-note')).to_contain_text('中断练习');assert grid.locator('.aim-splits').count()==0;ok('中断过的回合明确标注且不参与快慢比较')
    other=context.new_page();other.goto(URL+'?aim=v1-'+seed);same=open_cover(other,'gridwake');assert same.locator('.aim-range').get_attribute('data-seed')==seed;other.close()
    ok('同题链接在新页面复现种子，不共享或伪造玩家成绩')
    close(grid)
    for _ in range(6):
        for kind in ['photos','faerie','gridwake','roamisle']:
            c=open_cover(page,kind);assert c.locator('.cover-engine > :first-child').count()==1;close(c)
    assert page.locator('.playable-cover[data-running="true"]').count()==0;ok('反复开启收起不重复挂载四种引擎，空闲保持停止状态')
    response=context.request.get(URL+'build-info.json');assert response.ok
    info=response.json();assert info['target']=='pages' and len(info['sourceSha'])==40
    expect(page.locator('.build-stamp')).to_contain_text(info['sourceSha'][:10]);ok('页面构建标识与实际产物中的源码 SHA 一致')

    for width in [320,390,768]:
        mobile=browser.new_context(viewport={'width':width,'height':900},has_touch=True,is_mobile=True)
        m=mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(URL)
        for kind in ['photos','faerie','roamisle','gridwake']:
            c=open_cover(m,kind);c.get_by_role('button',name='展开游玩',exact=True).tap()
            assert c.locator('dialog').evaluate('(el)=>el.matches(":modal")')
            assert m.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if kind=='faerie':c.get_by_role('button',name='绘制微风',exact=True).tap()
            if kind=='roamisle':c.get_by_role('button',name='赶在月落前',exact=True).tap()
            c.locator('dialog').screenshot(path=str(OUT/f'expanded-{kind}-{width}.png'))
            c.get_by_role('button',name='还原大小',exact=True).tap();close(c)
        mobile.close();ok(f'{width}px 触屏展开、还原和关闭均可用，无横向溢出')
    assert not errors,errors;ok('连续体验专项无浏览器脚本异常');browser.close()
print('连续体验回归全部通过。',flush=True)
