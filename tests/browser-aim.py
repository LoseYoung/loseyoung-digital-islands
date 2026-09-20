"""六点瞄准专项回归：真实浏览器输入；所有计分经界面完成，不直接调用业务函数。"""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('TEST_URL', 'http://127.0.0.1:8765/loseyoung-digital-islands/')
OUT = Path(os.environ.get('TEST_OUTPUT', 'outputs/playgrounds')) / 'aim'
OUT.mkdir(parents=True, exist_ok=True)
checks = []
def ok(message):
    checks.append(message)
    (OUT / 'report.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2), encoding='utf-8')
    print('通过：' + message, flush=True)
def open_range(page):
    c = page.locator('[data-kind="gridwake"]')
    c.locator('.cover-launch').scroll_into_view_if_needed()
    c.locator('.cover-launch').click()
    expect(c.locator('.aim-range')).to_be_visible()
    return c

def hit(c, number):
    return c.get_by_role('button', name=f'命中节点 {number}', exact=True)

with sync_playwright() as p:
    launch = {'args': ['--no-sandbox', '--enable-unsafe-swiftshader']}
    if os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'):
        launch['executable_path'] = os.environ['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
    browser = p.chromium.launch(**launch)
    errors = []
    page = browser.new_page(viewport={'width':1440,'height':1000})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script('''
      window.__aimIntervals = new Set();
      const start = window.setInterval.bind(window), stop = window.clearInterval.bind(window);
      window.setInterval = (...args) => { const id = start(...args); window.__aimIntervals.add(id); return id; };
      window.clearInterval = id => { window.__aimIntervals.delete(id); stop(id); };
    ''')
    page.goto(URL)
    c = open_range(page)
    page.wait_for_timeout(300)
    expect(c.locator('.aim-stat-value').nth(1)).to_have_text('0.00s')
    assert c.locator('.aim-lamp').count() == 6
    c.screenshot(path=str(OUT / 'desktop-ready.png'))
    ok('准备状态不计时，六段进度和独立训练界面正常')

    f = c.locator('.target-field').bounding_box()
    page.mouse.click(f['x'] + 9, f['y'] + 9)
    for n in range(1, 7):
        if n == 2:
            t = hit(c, n); expect(t).to_be_visible(); b = t.bounding_box()
            t.click(position={'x':b['width']*.85,'y':b['height']*.5})
        else:
            hit(c, n).click()
    expect(c.locator('.aim-range')).to_have_attribute('data-phase', 'complete')
    expect(c.locator('.play-status')).to_contain_text('空击 1')
    values = c.locator('.aim-result-stat strong').all_text_contents()
    assert values[1] == '86%' and values[3] == '5 / 6', values
    assert re.fullmatch(r'\d+ms', values[2]), values
    assert c.locator('.aim-lamp[data-hit="center"]').count() == 5
    c.screenshot(path=str(OUT / 'desktop-result.png'))
    before = c.locator('.aim-stat-value').nth(1).inner_text()
    page.wait_for_timeout(250)
    assert c.locator('.aim-stat-value').nth(1).inner_text() == before
    assert page.evaluate('window.__aimIntervals.size') == 0
    ok('真实中心和边缘点击区分准确，成绩面板统计正确且结算后停止计时')

    c.get_by_role('button', name='重来', exact=True).click()
    expect(hit(c, 1)).to_be_visible()
    expect(c.locator('.aim-stat-value').last).to_have_text('—')
    hit(c, 1).focus()
    for n in range(1, 7):
        expect(hit(c, n)).to_be_focused()
        page.keyboard.press('Enter')
    expect(c.locator('.aim-results')).to_be_focused()
    expect(c.locator('.aim-result-note')).to_contain_text('键盘辅助')
    assert c.locator('.aim-result-stat strong').last.inner_text() == '—'
    ok('重来清空旧成绩；键盘六击连续聚焦且不伪报精度')

    c.get_by_role('button', name='重来', exact=True).click()
    hit(c, 1).click()
    c.get_by_role('button', name='收起 Gridwake 的互动').click()
    expect(c.locator('.cover-launch')).to_be_focused()
    page.wait_for_timeout(250)
    assert page.evaluate('window.__aimIntervals.size') == 0
    assert c.locator('.aim-range').count() == 0
    ok('切换目标期间收起：计时、延迟任务和 DOM 全部清理')

    c = open_range(page); hit(c, 1).click()
    page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
    expect(c).to_have_attribute('data-playing','false')
    assert page.evaluate('window.__aimIntervals.size') == 0
    ok('滚离训练场后自动退出，没有后台计时')

    for width in [320,390,768,1050]:
        context = browser.new_context(viewport={'width':width,'height':900}, has_touch=True, is_mobile=width<641)
        m = context.new_page(); m.on('pageerror',lambda e:errors.append(str(e)))
        m.goto(URL); mc = open_range(m)
        toolbar = mc.locator('.play-toolbar').bounding_box(); hud = mc.locator('.aim-hud').bounding_box()
        assert hud['y'] >= toolbar['y'] + toolbar['height'] - 1, (width, toolbar, hud)
        for n in range(1,7):
            t = hit(mc,n); expect(t).to_be_visible()
            tb = t.bounding_box(); fb = mc.locator('.aim-field').bounding_box()
            assert tb['width'] >= 44 and tb['height'] >= 44
            assert tb['x'] >= fb['x'] and tb['x']+tb['width'] <= fb['x']+fb['width']
            assert tb['y'] >= fb['y'] and tb['y']+tb['height'] <= fb['y']+fb['height']
            t.tap()
        expect(mc.locator('.aim-results')).to_be_visible()
        assert m.evaluate('document.documentElement.scrollWidth<=innerWidth')
        mc.screenshot(path=str(OUT / f'touch-result-{width}.png'))
        context.close()
    ok('320/390/768/1050px 触屏布局无遮挡、目标不越界、六点均可点按')

    reduced = browser.new_context(viewport={'width':1280,'height':900}, reduced_motion='reduce')
    r = reduced.new_page(); r.goto(URL); rc = open_range(r)
    for n in range(1,7): hit(rc,n).click()
    expect(rc.locator('.aim-results')).to_be_visible()
    assert rc.locator('.aim-range').evaluate('(e)=>e.getAnimations({subtree:true}).filter(a=>a.playState==="running").length') == 0
    ok('减少动态效果时保留完整玩法，不启动准星或命中特效动画')
    assert not errors, errors
    ok('专项浏览器回归无脚本异常')
    browser.close()
print('六点瞄准专项回归全部通过。', flush=True)
