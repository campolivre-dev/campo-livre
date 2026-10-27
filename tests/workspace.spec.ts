import { expect, test } from '@playwright/test';

test('login, mapa 3D com cinco fontes, controles e navegação por áreas', async ({ page }) => {
  const errors: string[] = [];
  const mapImages = new Set<string>();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.ok() && response.url().includes('/src/components/') && response.url().endsWith('.png')) mapImages.add(response.url()); });
  await page.goto('/');
  await page.screenshot({ path: '/tmp/campo-livre-login-inhaus.png', fullPage: true });
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await expect(page.locator('.screen-power-on')).toBeVisible();
  await expect(page.locator('.screen-power-on')).toHaveCount(0, { timeout: 20000 });
  await expect(page.locator('.workspace')).not.toHaveAttribute('inert');
  await expect(page.getByRole('heading', { name: 'Visão da operação.' })).toBeVisible();
  await expect(page.getByText('Preparando sua visão do campo…')).toBeHidden({ timeout: 20000 });
  await expect(page.locator('.map-viewport')).toHaveAttribute('aria-busy', 'false', { timeout: 20000 });
  await expect(page.locator('.map-renderer canvas')).toBeVisible();
  const mapBounds = await page.locator('.map-renderer canvas').boundingBox();
  expect(mapBounds).toEqual({ x: 0, y: 0, width: 1440, height: 1000 });
  await expect(page.getByRole('button', { name: 'Aproximar mapa' })).toHaveCount(0);
  await expect.poll(() => mapImages.size).toBe(5);
  const pin = page.getByRole('button', { name: 'Abrir área Metalurgia', exact: true });
  const before = await pin.getAttribute('style');
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, -180);
  await expect.poll(() => pin.getAttribute('style')).not.toBe(before);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(740, 500, { steps: 5 });
  await page.mouse.up({ button: 'right' });
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.getByRole('button', { name: '2D', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restaurar visão geral' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Volumes', exact: true })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/campo-livre-hub-desktop.png', fullPage: true });
  await pin.click();
  await expect(page.getByRole('heading', { name: 'Metalurgia.' })).toBeVisible();
  const preventives = page.locator('.op-metrics > div').filter({ hasText: 'Preventivas no mês selecionado' }).locator('strong');
  await page.getByLabel('Mês das preventivas').fill('2026-09');
  await expect(preventives).toHaveText('01');
  await page.getByLabel('Mês das preventivas').fill('2026-08');
  await expect(preventives).toHaveText('00');
  await page.getByRole('link', { name: /Split Hi-Wall/ }).click();
  await expect(page.getByRole('heading', { name: 'Histórico de manutenção' })).toBeVisible();
  await page.screenshot({ path: '/tmp/campo-livre-equipment-desktop.png', fullPage: true });
  await expect(page.getByText('Ana Martins', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Sair da demonstração' }).click();
  await expect(page.getByRole('heading', { name: 'Bom te ver por aqui.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('perda de WebGL mantém os marcadores visíveis e navegáveis', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await expect(page.locator('.map-viewport')).toHaveAttribute('aria-busy', 'false', { timeout: 20000 });
  await page.getByRole('button', { name: 'Localizar Metalurgia no mapa' }).click();
  await page.locator('.map-renderer canvas').evaluate(canvas => {
    const context = (canvas as HTMLCanvasElement).getContext('webgl2');
    const extension = context?.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('O navegador de testes não oferece a simulação de perda de contexto.');
    extension.loseContext();
  });
  await expect(page.getByText(/O modo 3D ficou indisponível/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir área Obras', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir área Obras', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Obras.' })).toBeVisible();
});

test('execução, devolução, reenvio e aprovação preservam histórico após recarregar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await page.getByRole('link', { name: 'Ativos', exact: true }).click();
  const motor = page.locator('.directory-card').filter({ has: page.getByRole('heading', { name: 'Split Inverter' }) });
  await motor.getByRole('button', { name: 'Ver equipamento e histórico' }).click();
  await page.getByLabel('Simular perfil').selectOption('technician');
  await page.getByRole('button', { name: 'Registrar execução', exact: false }).click();
  await page.getByLabel('Trabalho realizado').fill('Inspeção demonstrativa para validar o histórico compartilhado.');
  await page.getByLabel('Alterações no equipamento').fill('Ajuste demonstrativo.');
  await page.getByRole('button', { name: 'Enviar para aprovação', exact: true }).click();
  await expect(page.getByText('Aguardando aprovação', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprovar conclusão' })).toHaveCount(0);
  await page.getByLabel('Simular perfil').selectOption('supervisor');
  await page.getByRole('button', { name: 'Devolver para correção' }).click();
  await page.getByLabel('Motivo da devolução').fill('Descrever o resultado da verificação.');
  await page.getByRole('button', { name: 'Enviar para correção' }).click();
  await expect(page.getByText('Devolvida para correção', { exact: true })).toBeVisible();
  await page.getByLabel('Simular perfil').selectOption('technician');
  await page.getByRole('button', { name: 'Complementar e reenviar' }).click();
  await page.getByLabel('Trabalho realizado').fill('Relato complementado: verificação demonstrativa concluída.');
  await page.getByRole('button', { name: 'Reenviar para aprovação' }).click();
  await page.getByLabel('Simular perfil').selectOption('supervisor');
  await page.getByRole('button', { name: 'Aprovar conclusão' }).click();
  await expect(page.getByText('Concluída', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Concluída', { exact: true })).toBeVisible();
  await page.getByText('Ver trilha do registro', { exact: false }).click();
  await expect(page.getByText('Inspeção demonstrativa para validar o histórico compartilhado.', { exact: true })).toBeVisible();
  await expect(page.getByText('Descrever o resultado da verificação.', { exact: true })).toBeVisible();
  await expect(page.getByText('4 eventos')).toBeVisible();
});

test('mobile permite explorar o mapa e não tem overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await expect(page.getByRole('heading', { name: 'Visão da operação.' })).toBeVisible();
  await expect(page.locator('.map-viewport')).toHaveAttribute('aria-busy', 'false', { timeout: 20000 });
  await expect(page.locator('.screen-power-on')).toHaveCount(0);
  await expect(page.locator('.map-renderer canvas')).toBeVisible();
  expect(await page.locator('.map-renderer canvas').boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Restaurar visão geral' })).toBeHidden();
  await page.screenshot({ path: '/tmp/campo-livre-hub-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: /Explore a planta/ }).click();
  await page.getByRole('searchbox', { name: 'Buscar área' }).fill('Metalurgia');
  await page.getByRole('button', { name: 'Localizar Metalurgia no mapa' }).click();
  await expect(page.getByRole('button', { name: /Explore a planta/ })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Abrir menu de navegação' }).click();
  await page.getByRole('link', { name: 'Áreas', exact: true }).click();
  await page.locator('.directory-card').first().getByRole('button', { name: 'Abrir área' }).click();
  await page.getByRole('link', { name: /Split Hi-Wall/ }).click();
  await page.getByLabel('Simular perfil').selectOption('technician');
  await page.getByRole('button', { name: 'Registrar execução', exact: false }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/campo-livre-equipment-mobile.png', fullPage: true });
});

test('navegação pelas áreas continua disponível sem WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await expect(page.getByText(/Este navegador não disponibilizou o modo 3D/)).toBeVisible();
  await page.getByRole('button', { name: 'Abrir área Metalurgia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Metalurgia.' })).toBeVisible();
});

test('equipes mostram os três supervisores, fotos e áreas com busca', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await page.getByRole('link', { name: 'Equipes', exact: true }).click();
  await expect(page.locator('.team-card')).toHaveCount(3);
  for (const name of ['Silverio', 'Yuri', 'Claudio']) {
    const card = page.locator('.team-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
    await expect(card.locator('.team-supervisor-label')).toHaveText('Supervisor');
    await expect.poll(() => card.locator('img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.screenshot({ path: '/tmp/campo-livre-equipes-desktop.png', fullPage: true });
  await page.getByRole('searchbox', { name: 'Buscar equipes' }).fill('Yuri');
  await expect(page.locator('.team-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Obras', exact: true }).click();
  await expect(page.locator('.op-team-supervisor')).toContainText('Yuri');
  await expect(page.locator('.op-team-image')).toBeVisible();
  await page.getByRole('link', { name: 'Equipes', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Buscar equipes' }).fill('Metalurgia');
  await expect(page.getByRole('heading', { name: 'Silverio', exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar equipes' }).fill('inexistente');
  await expect(page.getByRole('heading', { name: 'Nenhuma equipe encontrada' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/campo-livre-equipes-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('movimento reduzido revela mapa navegável e mantém sessão ao recarregar', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByLabel('E-mail', { exact: true }).fill('supervisor@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('demonstracao');
  await page.getByRole('button', { name: 'Entrar no CampoLivre' }).click();
  await expect(page.locator('.screen-power-on')).toHaveCount(0, { timeout: 20000 });
  await expect(page.locator('.workspace')).not.toHaveAttribute('inert');
  await expect(page.getByRole('button', { name: '3D', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Visão da operação.' })).toBeVisible();
  await expect(page.locator('.screen-power-on')).toHaveCount(0);
});

test('mudar de rota durante abertura libera navegação', async ({ page }) => {
  await page.goto('/#/equipes');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await expect(page.locator('.screen-power-on')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Nossas equipes.' })).toBeVisible();
  await expect(page.locator('.screen-power-on')).toHaveCount(0);
  await expect(page.locator('.workspace')).not.toHaveAttribute('inert');
});
