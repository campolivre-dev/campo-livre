import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const metric = (page: Page, label: string) => page.locator('.ind-metric').filter({ has: page.getByText(label, { exact: true }) }).locator('strong');

async function selectSeptember(page: Page) {
  await page.getByLabel('Mês de execução').fill('2026-09');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('campo-livre:demo-session', 'active'));
});

test('indicadores filtram o histórico, permitem consultar equipamentos e cabem no celular', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/indicadores');
  await selectSeptember(page);
  await expect(page.locator('.ind-period')).toContainText('5 registros no período');
  await expect(metric(page, 'Preventivas aprovadas')).toHaveText('2');
  await expect(metric(page, 'Aguardando aprovação')).toHaveText('2');
  await expect(metric(page, 'Devolvidas para correção')).toHaveText('1');
  await expect(page.getByRole('img', { name: /Manutenções aprovadas por mês/ })).toHaveAttribute('aria-label', /setembro de 2026: 2/);
  await page.getByText('Ver números do gráfico', { exact: true }).click();
  await expect(page.getByRole('table', { name: 'Manutenções aprovadas nos últimos seis meses' }).getByRole('row', { name: 'setembro de 2026 2 0 0' })).toBeVisible();
  await page.getByText('Ver números do gráfico', { exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '/tmp/campo-livre-indicadores-desktop.png', fullPage: true });

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Abrir menu de navegação' }).click();
    const navBounds = await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link').evaluateAll(links => links.map(link => {
      const { left, right, top, bottom } = link.getBoundingClientRect();
      return { left, right, top, bottom };
    }));
    const exitBounds = await page.getByRole('button', { name: 'Sair da demonstração' }).boundingBox();
    expect(navBounds).toHaveLength(6);
    for (let i = 0; i < navBounds.length; i++) {
      const bounds = navBounds[i];
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(width);
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom).toBeLessThanOrEqual(844);
      if (i > 0) expect(bounds.top).toBeGreaterThanOrEqual(navBounds[i - 1].bottom);
    }
    expect(navBounds.at(-1)!.bottom).toBeLessThanOrEqual(exitBounds!.y);
    await page.getByRole('button', { name: 'Fechar menu de navegação' }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/campo-livre-indicadores-mobile.png', fullPage: true });

  await page.getByRole('combobox', { name: 'Área', exact: true }).selectOption('central');
  await expect(page.locator('.ind-period')).toContainText('2 registros no período');
  await expect(metric(page, 'Aguardando aprovação')).toHaveText('1');
  await expect(metric(page, 'Devolvidas para correção')).toHaveText('1');
  await page.getByRole('combobox', { name: 'Tipo de manutenção' }).selectOption('corretiva');
  await expect(page.locator('.ind-period')).toContainText('1 registro no período');
  await expect(metric(page, 'Devolvidas para correção')).toHaveText('1');
  await expect(page.locator('.ind-records tbody tr')).toHaveCount(1);
  await page.getByLabel('Mês de execução').fill('2099-01');
  await expect(page.getByRole('heading', { name: 'Nenhuma execução neste período' })).toBeVisible();
  await expect(metric(page, 'Preventivas aprovadas')).toHaveText('0');
  await selectSeptember(page);
  await page.getByRole('link', { name: 'Ver histórico de CHI-001, execução em 27/09/2026' }).click();
  await expect(page).toHaveURL(/#\/areas\/central\/equipamentos\/chiller-01$/);
  await expect(page.getByRole('heading', { name: 'Histórico de manutenção' })).toBeVisible();
  await expect(page.getByText('Devolvida para correção', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('execução registrada e aprovada atualiza os indicadores e persiste ao recarregar', async ({ page }) => {
  await page.goto('/#/areas/oeste/equipamentos/split-inverter-01');
  await page.getByLabel('Simular perfil').selectOption('technician');
  await page.getByRole('button', { name: 'Registrar execução', exact: false }).click();
  await page.getByLabel('Data da execução').fill('2026-09-20');
  await page.getByLabel('Trabalho realizado').fill('Limpeza dos filtros para validar indicadores integrados ao histórico.');
  await page.getByRole('button', { name: 'Enviar para aprovação', exact: true }).click();
  await expect(page.getByText('Aguardando aprovação', { exact: true })).toBeVisible();
  await page.getByLabel('Simular perfil').selectOption('supervisor');
  await page.getByRole('link', { name: 'Indicadores', exact: true }).click();
  await selectSeptember(page);
  await expect(page.locator('.ind-period')).toContainText('6 registros no período');
  await expect(metric(page, 'Preventivas aprovadas')).toHaveText('2');
  await expect(metric(page, 'Aguardando aprovação')).toHaveText('3');
  await page.getByRole('link', { name: 'Ver histórico de SIV-001, execução em 20/09/2026' }).click();
  await page.getByRole('button', { name: 'Aprovar conclusão' }).click();
  await expect(page.getByText('Concluída', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Indicadores', exact: true }).click();
  await selectSeptember(page);
  await expect(metric(page, 'Preventivas aprovadas')).toHaveText('3');
  await expect(metric(page, 'Aguardando aprovação')).toHaveText('2');
  await expect(page.getByRole('img', { name: /Manutenções aprovadas por mês/ })).toHaveAttribute('aria-label', /setembro de 2026: 3/);
  await page.reload();
  await selectSeptember(page);
  await expect(metric(page, 'Preventivas aprovadas')).toHaveText('3');
  await expect(page.locator('.ind-period')).toContainText('6 registros no período');
});

test('perfis gerenciais consultam indicadores e técnicos e auxiliares acessam o histórico', async ({ page }) => {
  await page.goto('/#/indicadores');
  for (const role of ['supervisor', 'leader']) {
    await page.getByLabel('Simular perfil').selectOption(role);
    await selectSeptember(page);
    await expect(page.getByRole('region', { name: 'Indicadores de manutenção' })).toBeVisible();
    await expect(page.getByText('Visão geral da demonstração', { exact: true })).toBeVisible();
    await expect(page.locator('.ind-period')).toContainText('5 registros no período');
    await expect(page.getByLabel('Equipe de referência')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Aprovar conclusão' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Registrar execução/ })).toHaveCount(0);
  }
  await page.getByLabel('Simular perfil').selectOption({ label: 'Técnico / Auxiliar' });
  await expect(page).toHaveURL(/#\/indicadores$/);
  await expect(page.getByText('Para consultar o histórico ou registrar seu trabalho, abra um equipamento.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Indicadores', exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: /Manutenções aprovadas por mês/ })).toHaveCount(0);
  await expect(page.getByRole('form', { name: 'Filtros dos indicadores' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Ver equipamentos' }).click();
  await expect(page).toHaveURL(/#\/equipamentos$/);
  await page.getByLabel('Buscar equipamentos').fill('SHW-001');
  await page.getByRole('button', { name: 'Ver equipamento e histórico' }).click();
  await expect(page.getByRole('heading', { name: 'Histórico de manutenção' })).toBeVisible();
  await expect(page.locator('.op-report-description').filter({ hasText: 'Realizada limpeza dos filtros e inspeção da unidade evaporadora.' })).toBeVisible();
  await expect(page.locator('.op-report-fields').getByText('Filtro demonstrativo higienizado.', { exact: true })).toBeVisible();
  await expect(page.locator('.op-report-fields').getByText('Reavaliar drenagem na próxima inspeção.', { exact: true })).toBeVisible();
  await expect(page.locator('.op-record-author').filter({ hasText: 'Lucas Ferreira' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprovar conclusão' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Devolver para correção' })).toHaveCount(0);
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '/tmp/campo-livre-auxiliar-mobile.png', fullPage: true });
});
