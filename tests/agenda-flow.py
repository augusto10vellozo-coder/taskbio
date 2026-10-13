import asyncio,json
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  page=await browser.new_page(viewport={"width":1280,"height":1800},reduced_motion='reduce')
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080',wait_until='networkidle')
  # Create through actual agenda UI, no demo data.
  await page.get_by_role('button',name='Adicionar',exact=True).click()
  await page.get_by_label('Categoria').select_option('treino')
  await page.get_by_label('Título',exact=True).fill('Treino de verificação')
  await page.get_by_role('button',name='Salvar',exact=True).click()
  await page.get_by_role('button',name='Adicionar',exact=True).click()
  await page.get_by_label('Título',exact=True).fill('Estudar')
  await page.get_by_role('button',name='Salvar',exact=True).click()
  summary=page.get_by_role('button',name='Ir para a Linha do dia de hoje')
  assert await summary.inner_text()=='2 itens hoje · 0 concluídos'
  timeline=page.get_by_role('region',name='Linha do dia',exact=True)
  await timeline.get_by_role('button',name='Concluir Treino de verificação',exact=True).click()
  assert await summary.inner_text()=='2 itens hoje · 1 concluído'
  assert await page.get_by_role('button',name='Concluído',exact=True).get_attribute('aria-pressed')=='true'
  assert await timeline.get_by_role('button',name='Desmarcar Treino de verificação',exact=True).get_attribute('aria-pressed')=='true'
  assert '50%' in await page.get_by_label('Progresso da semana',exact=True).inner_text()
  assert '50%' in await page.locator('main').inner_text()
  await page.screenshot(path='/tmp/browser/agenda/synchronized.png')
  await page.set_viewport_size({"width":1280,"height":900})
  await summary.click()
  await page.wait_for_timeout(300)
  assert await page.evaluate('window.scrollY')>0
  assert await timeline.is_visible()
  for step in (1,2):
   before=await page.evaluate('localStorage.getItem("trilha.state.v2")')
   await page.get_by_role('button',name='Opções da semana').click()
   await page.get_by_role('menuitem',name='Limpar semana',exact=True).click()
   dialog=page.get_by_role('alertdialog')
   assert await dialog.is_visible()
   assert 'Isso apaga todos os itens da semana. Esta ação não pode ser desfeita' in await dialog.inner_text()
   assert not await dialog.get_by_role('button',name='Limpar definitivamente').count()
   if step==2:
    await dialog.get_by_role('button',name='Continuar',exact=True).click()
    assert await dialog.get_by_role('button',name='Limpar definitivamente').is_visible()
   await page.screenshot(path=f'/tmp/browser/agenda/confirmation-{step}.png')
   await dialog.get_by_role('button',name='Cancelar',exact=True).click()
   await page.get_by_role('alertdialog').wait_for(state='hidden')
   assert before==await page.evaluate('localStorage.getItem("trilha.state.v2")')
  await page.reload(wait_until='networkidle')
  assert await page.get_by_role('button',name='Ir para a Linha do dia de hoje').inner_text()=='2 itens hoje · 1 concluído'
  await page.set_viewport_size({'width':390,'height':844})
  await page.screenshot(path='/tmp/browser/agenda/mobile.png')
  assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
  await page.get_by_role('button',name='Opções da semana').click()
  await page.get_by_role('menuitem',name='Limpar semana',exact=True).click()
  await page.get_by_role('alertdialog').get_by_role('button',name='Continuar',exact=True).click()
  await page.get_by_role('alertdialog').get_by_role('button',name='Limpar definitivamente').click()
  assert await page.get_by_role('button',name='Ir para a Linha do dia de hoje').inner_text()=='0 itens hoje · 0 concluídos'
  assert await page.get_by_text('Monte sua primeira semana',exact=True).is_visible()
  assert not await page.get_by_text('Compras da semana',exact=True).count()
  assert not errors, errors
  print('PASS: completion synchronizes summary/workout/progress; scrolling; cancel both steps preserves data; reload; mobile; confirmed deletion; empty states; no runtime errors')
  await browser.close()
asyncio.run(main())
