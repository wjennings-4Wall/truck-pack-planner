import asyncio, os, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
os.chdir(ROOT),base64,glob
from playwright.async_api import async_playwright
LIB={'three.min.js':'node_modules/three/build/three.min.js','OrbitControls.js':'node_modules/three/examples/js/controls/OrbitControls.js','jspdf.umd.min.js':'node_modules/jspdf/dist/jspdf.umd.min.js'}
INIT=open(ROOT / 'tools' / 'exp.py').read().split('INIT="""')[1].split('"""')[0]
async def route(r):
  u=r.request.url
  for k,v in LIB.items():
    if u.endswith(k): return await r.fulfill(path=v,content_type='application/javascript')
  if 'fonts.g' in u: return await r.fulfill(body='',content_type='text/css')
  await r.continue_()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or None,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=await b.new_page(viewport={'width':1300,'height':950})
    await pg.add_init_script(INIT); await pg.route('**/*',route)
    pg.on('pageerror',lambda e:print('PAGEERR',e))
    await pg.goto((ROOT / 'dist' / 'index.html').as_uri()); await pg.wait_for_timeout(1200)
    # --- adjust on single truck
    await pg.click('[data-adj]:nth-of-type(1) >> nth=24'); await pg.wait_for_timeout(300)  # case 25? (console)
    print('ADJ', await pg.inner_text('#adjT'), '|', await pg.inner_text('#adjPos'))
    await pg.click('[data-a=rot]'); await pg.wait_for_timeout(300); print('rot:', await pg.inner_text('#adjMsg'), '|', await pg.inner_text('#adjPos'))
    await pg.click('[data-a=doors]'); await pg.wait_for_timeout(300); print('doors:', await pg.inner_text('#adjMsg'), '|', await pg.inner_text('#adjPos'))
    await pg.click('[data-a=scurb]'); await pg.wait_for_timeout(300); print('scurb:', await pg.inner_text('#adjMsg'), '|', await pg.inner_text('#adjPos'))
    await pg.click('[data-a=snose]'); await pg.wait_for_timeout(300); print('snose:', await pg.inner_text('#adjMsg'), '|', await pg.inner_text('#adjPos'))
    # move a bottom case with stack: case 1 toward doors (blocked) 
    await pg.click('[data-adj] >> nth=0'); await pg.wait_for_timeout(200)
    await pg.click('[data-a=doors]'); await pg.wait_for_timeout(300); print('stack doors:', await pg.inner_text('#adjMsg'))
    await pg.click('[data-a=rot]'); await pg.wait_for_timeout(300); print('stack rot:', await pg.inner_text('#adjMsg'))
    await pg.locator('#vp').screenshot(path='m_adj.png')
    await pg.screenshot(path='m_full1.png')
    print('manual banner hidden?', await pg.get_attribute('#manual','hidden'))
    await pg.click('[data-a=done]')
    # --- add truck
    await pg.click('[data-add]'); await pg.wait_for_timeout(500)
    await pg.select_option('#truckSel','box20'); await pg.wait_for_timeout(400)
    # go back to truck 1, make it a 16'
    await pg.click('.ttab >> nth=0'); await pg.wait_for_timeout(300)
    await pg.click('#autoBtn'); await pg.wait_for_timeout(300)
    await pg.select_option('#truckSel','box16'); await pg.wait_for_timeout(400)
    # assign chain motors to Truck 2
    rows=await pg.query_selector_all('.case')
    sel=await rows[-1].query_selector('select[data-k=truckId]')
    opts=await sel.evaluate("s=>[...s.options].map(o=>o.value)")
    await sel.select_option(opts[2]); await pg.wait_for_timeout(500)
    print('tabs:', await pg.inner_text('#ttabs'))
    print('where:', [await r.eval_on_selector('[data-where]','e=>e.textContent') for r in rows])
    print('warns:', await pg.inner_text('#warns'))
    print('stats:', (await pg.inner_text('#stats'))[:120].replace('\n',' '))
    await pg.screenshot(path='m_full2.png', full_page=True)
    await pg.click('.ttab >> nth=1'); await pg.wait_for_timeout(400)
    await pg.locator('#vp').screenshot(path='m_t2.png')
    print('restraints t2:', await pg.inner_text('#rsl'))
    for x in ['pdf','html','csv']:
      await pg.click(f'[data-x={x}]'); await pg.wait_for_timeout(4000 if x=='pdf' else 500)
    await pg.select_option('#xScope','this'); await pg.click('[data-x=pdf]'); await pg.wait_for_timeout(3000)
    saved=await pg.evaluate('window.__saved')
    for fn,d in saved:
      print(fn,len(d)); open('m_out_'+fn,'wb').write(base64.b64decode(d[4:]) if d.startswith('B64:') else d.encode())
    # crew
    c=await b.new_page(viewport={'width':1100,'height':900}); await c.route('**/*',route); c.on('pageerror',lambda e:print('PAGEERR crew',e))
    f=glob.glob('m_out_*3d-load-plan.html')[0]; await c.goto((ROOT / f).as_uri()); await c.wait_for_timeout(1200)
    await c.click('#tabs button >> nth=1'); await c.wait_for_timeout(400); await c.screenshot(path='m_crew.png')
    # mobile
    m=await b.new_page(viewport={'width':390,'height':844}); await m.add_init_script(INIT); await m.route('**/*',route); m.on('pageerror',lambda e:print('PAGEERR m',e))
    await m.goto((ROOT / 'dist' / 'index.html').as_uri()); await m.wait_for_timeout(1200); await m.screenshot(path='m_mob.png')
    await b.close()
asyncio.run(main())
