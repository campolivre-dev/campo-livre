import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const metric = (page: Page, label: string) => page.locator('.ind-metric').filter({ has: page.getByText(label, { exact: true }) }).locator('strong');
const historyLink = (page: Page) => page.getByRole('link', { name: 'Ver histórico de SIV-001, execução em 30/09/2026' });

async function expectSeptemberCounts(page: Page, approved: number, pending: number, returned: number) {
  await page.getByRole('link', { name: 'Indicadores', exact: true }).click();
  await page.getByLabel('Mês de execução').fill('2026-09');
  await expect(page.locator('.ind-period')).toContainText('6 registros no período');
  await expect(page.locator('.ind-records tbody tr')).toHaveCount(6);
  await expect(historyLink(page)).toHaveCount(1);
  await expect(metric(page, 'Preventivas aprovadas')).toHaveText(String(approved));
  await expect(metric(page, 'Total de aprovações')).toHaveText(String(approved));
  await expect(metric(page, 'Aguardando aprovação')).toHaveText(String(pending));
  await expect(metric(page, 'Devolvidas para correção')).toHaveText(String(returned));
}

test('devolução e reenvio preservam uma manutenção e aprovação posterior atualiza o mês da execução', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-05T15:00:00Z'));
  await page.addInitScript(() => sessionStorage.setItem('campo-livre:demo-session', 'active'));
  await page.goto('/#/areas/oeste/equipamentos/split-inverter-01');
  await page.getByLabel('Simular perfil').selectOption('technician');
  await page.getByRole('button', { name: 'Registrar execução', exact: false }).click();
  await page.getByLabel('Data da execução').fill('2026-09-30');
  await page.getByLabel('Trabalho realizado').fill('Limpeza preventiva dos filtros realizada em setembro.');
  await page.getByRole('button', { name: 'Enviar para aprovação', exact: true }).click();
  await expect(page.getByText('Aguardando aprovação', { exact: true })).toBeVisible();
  await page.getByLabel('Simular perfil').selectOption('supervisor');
  await expectSeptemberCounts(page, 2, 3, 1);

  await historyLink(page).click();
  await page.getByRole('button', { name: 'Devolver para correção' }).click();
  await page.getByLabel('Motivo da devolução').fill('Informe o resultado do teste após a limpeza.');
  await page.getByRole('button', { name: 'Enviar para correção' }).click();
  await expect(page.getByText('Devolvida para correção', { exact: true })).toBeVisible();
  await expectSeptemberCounts(page, 2, 2, 2);

  await historyLink(page).click();
  await page.getByLabel('Simular perfil').selectOption('technician');
  await expect(page.getByText('Informe o resultado do teste após a limpeza.', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Complementar e reenviar' }).click();
  await expect(page.getByLabel('Data da execução')).toHaveValue('2026-09-30');
  await page.getByLabel('Trabalho realizado').fill('Limpeza preventiva concluída; teste confirmou vazão normal.');
  await page.getByRole('button', { name: 'Reenviar para aprovação' }).click();
  await expect(page.getByText('Aguardando aprovação', { exact: true })).toBeVisible();
  await page.getByLabel('Simular perfil').selectOption('supervisor');
  await expectSeptemberCounts(page, 2, 3, 1);

  await historyLink(page).click();
  await page.getByRole('button', { name: 'Aprovar conclusão' }).click();
  await expect(page.getByText('Concluída', { exact: true })).toBeVisible();
  await expectSeptemberCounts(page, 3, 2, 1);
  await expect(page.getByRole('img', { name: /Manutenções aprovadas por mês/ })).toHaveAttribute('aria-label', /setembro de 2026: 3/);
  await page.getByLabel('Mês de execução').fill('2026-10');
  await expect(page.locator('.ind-period')).toContainText('0 registros no período');
  await expect(metric(page, 'Preventivas aprovadas')).toHaveText('0');
  await expect(page.getByRole('img', { name: /Manutenções aprovadas por mês/ })).toHaveAttribute('aria-label', /setembro de 2026: 3/);

  await page.reload();
  await expectSeptemberCounts(page, 3, 2, 1);
  await historyLink(page).click();
  await expect(page.getByRole('heading', { name: 'Histórico de manutenção' })).toBeVisible();
  await expect(page.locator('.op-record')).toHaveCount(1);
  await expect(page.getByText('Concluída', { exact: true })).toBeVisible();
  await page.getByText('Ver trilha do registro', { exact: false }).click();
  const trail = page.locator('.op-event-history');
  await expect(trail.getByText('4 eventos')).toBeVisible();
  await expect(trail.getByText('Limpeza preventiva dos filtros realizada em setembro.', { exact: true })).toBeVisible();
  await expect(trail.getByText('Informe o resultado do teste após a limpeza.', { exact: true })).toBeVisible();
  await expect(trail.getByText('Limpeza preventiva concluída; teste confirmou vazão normal.', { exact: true })).toBeVisible();
  await expect(trail.getByText('Conclusão aprovada', { exact: true })).toBeVisible();
});
