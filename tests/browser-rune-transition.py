"""验证连续辅助施法后仍能手绘，不绕过真实指针输入。"""
import json, math, os
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('outputs/playgrounds/rune-transition'); OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.add_init_script('''window.inputLog=[];for(const type of ['pointerdown','pointermove','pointerup'])document.addEventListener(type,e=>{if(e.target instanceof HTMLCanvasElement){const r=e.target.getBoundingClientRect();inputLog.push({type,x:e.clientX,y:e.clientY,rect:[r.x,r.y,r.width,r.height]});if(inputLog.length>100)inputLog.shift()}},true);''')
    page.goto(os.environ['TEST_URL'])
    photo=page.locator('[data-kind="photos"]');photo.locator('.cover-launch').click()
    photo.get_by_role('button',name='显影整幅',exact=True).click()
    photo.get_by_role('button',name='收起',exact=False).click()
    rune=page.locator('[data-kind="faerie"]');rune.locator('.cover-launch').click()
    rune.locator('.craft-lab').wait_for(state='visible');page.wait_for_timeout(150)
    for label in ['月环','星芒','微风']:
        rune.get_by_role('button',name='绘制'+label,exact=True).click()
    canvas=rune.locator('canvas'); b=canvas.bounding_box()
    cx=b['x']+b['width']*.5;cy=b['y']+b['height']*.48;r=min(b['width'],b['height'])*.2
    page.screenshot(path=str(OUT/'before-draw.png'))
    page.mouse.move(cx+r,cy);page.mouse.down()
    for i in range(1,49):page.mouse.move(cx+math.cos(i/48*math.pi*2)*r,cy+math.sin(i/48*math.pi*2)*r)
    page.mouse.up()
    data={'canvas':b,'status':rune.locator('.play-status').inner_text(),'tokens':rune.locator('.rune-token').all_text_contents(),'input':page.evaluate('inputLog')}
    (OUT/'input.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
    page.screenshot(path=str(OUT/'after-draw.png'))
    assert '手绘共鸣' in rune.get_by_role('button',name='绘制月环',exact=True).inner_text(), data
    browser.close()
print('通过：辅助施法后仍可真实手绘月环。',flush=True)
