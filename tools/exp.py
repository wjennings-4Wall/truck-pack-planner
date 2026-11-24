import asyncio, os, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
os.chdir(ROOT),base64
from playwright.async_api import async_playwright
LIB={'three.min.js':'node_modules/three/build/three.min.js','OrbitControls.js':'node_modules/three/examples/js/controls/OrbitControls.js','jspdf.umd.min.js':'node_modules/jspdf/dist/jspdf.umd.min.js'}
INIT="""window.__saved=[];window.claude={use:n=>new Promise(r=>setTimeout(()=>r(n==='downloads'?{save:async o=>{let d=o.data;if(typeof d!=='string'){const u=new Uint8Array(d.buffer?d.buffer:d);let s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);d='B64:'+btoa(s)};window.__saved.push([o.filename,d]);return{status:'saved'}}}:null),50))};"""
async def route(r):
  u=r.request.url
  for k,v in LIB.items():
    if u.endswith(k): return await r.fulfill(path=v,content_type='application/javascript')
  if 'fonts.g' in u: return await r.fulfill(body='',content_type='text/css')
  await r.continue_()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or None,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=await b.new_page(viewport={'width':1300,'height':900})
    await pg.add_init_script(INIT); await pg.route('**/*',route)
    pg.on('pageerror',lambda e:print('PAGEERR',e))
    await pg.goto((ROOT / 'dist' / 'index.html').as_uri()); await pg.wait_for_timeout(1200)
    st=await pg.evaluate("document.querySelector('#seqT tr.rs').dataset.step")
    await pg.evaluate(f"document.getElementById('stepR').value={st};document.getElementById('stepR').dispatchEvent(new Event('input'))"); await pg.wait_for_timeout(300)
    await pg.locator('#vp').screenshot(path='vp_rs.png'); print(await pg.inner_text('#cap'))
    await pg.click('.seg button[data-v=side]'); await pg.wait_for_timeout(300); await pg.locator('#vp').screenshot(path='vp_rs_side.png'); await pg.click('.seg button[data-v=iso]')
    await pg.click('#allBtn'); await pg.wait_for_timeout(200)
    await pg.screenshot(path='full2.png',full_page=True)
    for x in ['pdf','html','csv','png']:
      await pg.click(f'[data-x={x}]'); await pg.wait_for_timeout(2500 if x=='pdf' else 400)
    saved=await pg.evaluate('window.__saved')
    for fn,d in saved:
      print(fn,len(d))
      open('out_'+fn,'wb').write(base64.b64decode(d[4:]) if d.startswith('B64:') else d.encode())
    # mobile
    m=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
    await m.route('**/*',route); m.on('pageerror',lambda e:print('PAGEERR m',e))
    await m.goto((ROOT / 'dist' / 'index.html').as_uri()); await m.wait_for_timeout(1200)
    await m.screenshot(path='mob.png',full_page=False)
    await m.evaluate("window.scrollTo(0, document.querySelector('.band').offsetTop)"); await m.screenshot(path='mob2.png')
    # crew html
    c=await b.new_page(viewport={'width':1100,'height':900}); await c.route('**/*',route); c.on('pageerror',lambda e:print('PAGEERR crew',e))
    import glob; f=glob.glob('out_*3d-load-plan.html')[0]
    await c.goto((ROOT / f).as_uri()); await c.wait_for_timeout(1200)
    st=await c.evaluate("DATA.plan.steps.findIndex(s=>s.kind==='restraint')+1")
    await c.evaluate(f"document.getElementById('rg').value={st};document.getElementById('rg').dispatchEvent(new Event('input'))"); await c.wait_for_timeout(300)
    await c.screenshot(path='crew.png')
    await b.close()
asyncio.run(main())
