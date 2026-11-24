import asyncio, os, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
os.chdir(ROOT),sys
from playwright.async_api import async_playwright
LIB={'three.min.js':'node_modules/three/build/three.min.js','OrbitControls.js':'node_modules/three/examples/js/controls/OrbitControls.js','jspdf.umd.min.js':'node_modules/jspdf/dist/jspdf.umd.min.js'}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or None,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    w=int(sys.argv[1]) if len(sys.argv)>1 else 1400
    pg=await b.new_page(viewport={'width':w,'height':1000})
    async def route(r):
      u=r.request.url
      for k,v in LIB.items():
        if u.endswith(k): return await r.fulfill(path=v,content_type='application/javascript')
      if 'fonts.g' in u: return await r.fulfill(body='',content_type='text/css')
      await r.continue_()
    await pg.route('**/*',route)
    pg.on('console',lambda m:print('CONSOLE',m.type,m.text))
    pg.on('pageerror',lambda e:print('PAGEERR',e))
    await pg.goto((ROOT / 'dist' / 'index.html').as_uri())
    await pg.wait_for_timeout(1500)
    await pg.screenshot(path=f'shot_{w}.png',full_page=True)
    for v in ['top','side','rear']:
      await pg.click(f'.seg button[data-v={v}]'); await pg.wait_for_timeout(300)
      await pg.locator('#vp').screenshot(path=f'vp_{v}.png')
    await pg.click('.seg button[data-v=iso]')
    await pg.fill('#stepR','0'); 
    await pg.evaluate("document.getElementById('stepR').value=14;document.getElementById('stepR').dispatchEvent(new Event('input'))")
    await pg.wait_for_timeout(300); await pg.locator('#vp').screenshot(path='vp_step.png')
    print(await pg.inner_text('#cap'))
    # crew html export
    html=await pg.evaluate("(()=>{let s=null; return 1})()")
    await b.close()
asyncio.run(main())
