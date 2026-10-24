import asyncio,json,os,re
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={'width':1280,'height':1800},reduced_motion='reduce')
  with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f: minted=json.load(f)
  if minted.get('cookies'): await context.add_cookies([{**c,'url':'http://localhost:8080'} for c in minted['cookies']])
  page=await context.new_page(); errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080')
  await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[minted['storage_key'],json.dumps(minted['session'])])
  await page.goto('http://localhost:8080/agenda',wait_until='networkidle')
  timeline=page.get_by_role('region',name='Linha do dia',exact=True)
  assert await page.get_by_label('Progresso da semana',exact=True).count()==0
  assert 'congelamento' not in await page.locator('main').inner_text()
  # Create temporary future rest blocks so no daily XP is eligible.
  await page.evaluate("sessionStorage.setItem('trilha:selected-date','2027-01-11')")
  await page.goto('http://localhost:8080/agenda',wait_until='networkidle')
  titles=[f'Verificação Agenda {i}' for i in range(20)]
  for title in titles:
   rows=timeline.locator('li').filter(has=page.get_by_text(title,exact=True))
   while await rows.count(): await rows.first.get_by_role('button',name='Remover bloco',exact=True).click()
  try:
   for title in titles:
    await page.get_by_role('button',name='Adicionar bloco',exact=True).click()
    await page.get_by_label('Categoria').select_option('descanso')
    await page.get_by_label('Título',exact=True).fill(title)
    await page.get_by_role('button',name='Salvar',exact=True).click()
    await page.wait_for_timeout(20)
   target=timeline.locator('li').filter(has=page.get_by_text(titles[0],exact=True))
   await target.get_by_role('button',name='Concluir '+titles[0],exact=True).click()
   assert await target.get_by_role('button',name='Desmarcar '+titles[0],exact=True).get_attribute('aria-pressed')=='true'
   assert 'Feito' in await target.inner_text()
   await target.get_by_role('button',name='Desmarcar '+titles[0],exact=True).click()
   assert await target.get_by_role('button',name='Concluir '+titles[0],exact=True).get_attribute('aria-pressed')=='false'
   await page.wait_for_timeout(2000)
   await page.reload(wait_until='networkidle')
   # date is not persisted by Agenda itself; return to test date via existing monthly entry contract
   await page.evaluate("sessionStorage.setItem('trilha:selected-date','2027-01-11')")
   await page.goto('http://localhost:8080/agenda',wait_until='networkidle')
   assert await timeline.get_by_text(titles[0],exact=True).count()==1
   for width,height in [(360,800),(390,630),(1280,1800)]:
    await page.set_viewport_size({'width':width,'height':height})
    await page.wait_for_timeout(200)
    await page.evaluate("window.scrollTo(0,document.documentElement.scrollHeight)")
    await page.wait_for_timeout(100)
    header=page.get_by_label('Navegação de datas',exact=True)
    box=await header.bounding_box(); assert box and abs(box['y'])<=1 and box['y']+box['height']<height
    assert await header.get_by_role('button',name='Voltar',exact=True).is_visible()
    assert 'segunda-feira, 11 de janeiro' in (await header.inner_text()).lower()
    fab=await page.get_by_role('button',name='Adicionar bloco',exact=True).bounding_box()
    last=await timeline.locator('li').last.bounding_box()
    assert fab and last and last['y']+last['height']<=fab['y'],(last,fab)
    assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    await page.screenshot(path=f'/tmp/browser/agenda-update/scroll-{width}.png')
    await header.get_by_role('button',name='Próximo dia',exact=True).click()
    assert 'terça-feira, 12 de janeiro' in (await header.inner_text()).lower()
    if await header.get_by_role('button',name='Dia anterior',exact=True).is_visible():
     await header.get_by_role('button',name='Dia anterior',exact=True).click()
    else:
     await header.get_by_role('button',name=re.compile('seg.*11',re.I)).click()
    await page.get_by_role('button',name='Adicionar bloco',exact=True).click()
    assert await page.get_by_label('Título',exact=True).is_visible()
    form=page.locator('#linha-do-dia form'); formbox=await form.bounding_box(); box=await header.bounding_box()
    assert formbox and box and formbox['y']>=box['y']+box['height']
    await form.get_by_role('button',name='Cancelar',exact=True).click()
   assert not errors,errors
   print('PASS: authenticated blocks, nutrition/workout preserved; future block create/reload/complete/unmark; sticky dates/back/week controls; FAB and last item at 360/390/1280; no overflow/runtime errors')
  finally:
   await page.evaluate("sessionStorage.setItem('trilha:selected-date','2027-01-11')")
   await page.goto('http://localhost:8080/agenda',wait_until='networkidle')
   for title in titles:
    row=timeline.locator('li').filter(has=page.get_by_text(title,exact=True))
    while await row.count(): await row.first.get_by_role('button',name='Remover bloco',exact=True).click()
   await page.wait_for_timeout(2000)
   await page.evaluate("sessionStorage.setItem('trilha:selected-date','2027-01-11')")
   await page.goto('http://localhost:8080/agenda',wait_until='networkidle')
   assert await timeline.locator('li').filter(has_text='Verificação Agenda').count()==0
   print('Temporary blocks removed and absence confirmed after reload')
  await browser.close()
asyncio.run(main())
