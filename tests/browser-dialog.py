"""展开后操作不能使原生 dialog 内部滚动，将关闭工具栏卷出视口。"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL=os.environ.get('TEST_URL','http://127.0.0.1:8765/loseyoung-digital-islands/')
OUT=Path(os.environ.get('TEST_OUTPUT','outputs/playgrounds'))/'dialog';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox','--enable-unsafe-swiftshader'])
    for width,height in [(320,900),(390,900),(768,900),(1440,1000),(844,500)]:
        context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<1000,is_mobile=width<641)
        page=context.new_page();page.goto(URL)
        for kind in ['photos','faerie','roamisle','gridwake']:
            c=page.locator(f'[data-kind="{kind}"]');c.locator('.cover-launch').click();expect(c.locator('.cover-engine > :first-child')).to_be_visible()
            c.get_by_role('button',name='展开游玩',exact=True).click()
            if kind=='photos':c.get_by_role('button',name='显影整幅',exact=True).click()
            if kind=='faerie':c.get_by_role('button',name='绘制微风',exact=True).click()
            if kind=='roamisle':c.get_by_role('button',name='赶在月落前',exact=True).click()
            if kind=='gridwake':c.get_by_role('button',name='命中节点 1',exact=True).click()
            dialog=c.locator('dialog');data=dialog.evaluate('''e=>({scroll:e.scrollTop,box:e.getBoundingClientRect().toJSON(),bar:e.querySelector('.play-toolbar').getBoundingClientRect().toJSON(),vh:innerHeight})''')
            assert data['scroll']==0,(width,kind,data)
            assert data['bar']['y']>=data['box']['y'] and data['bar']['y']>=0,(width,kind,data)
            assert data['bar']['bottom']<=data['vh'],(width,kind,data)
            if kind=='faerie' or width==1440:page.screenshot(path=str(OUT/f'expanded-{kind}-{width}x{height}.png'))
            c.get_by_role('button',name='还原大小',exact=True).click();c.get_by_role('button',name='收起',exact=False).click()
            expect(c.locator('.cover-launch')).to_be_focused()
        checks.append(f'{width}×{height} 展开后的操作保留工具栏，正常还原和关闭');print('通过：'+checks[-1],flush=True)
        context.close()
    browser.close()
(OUT/'report.json').write_text(json.dumps({'checks':checks,'count':len(checks)},ensure_ascii=False,indent=2),encoding='utf8')
