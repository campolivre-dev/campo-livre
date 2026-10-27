import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
const photo = { name: 'referencia-teste.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAoCAIAAADBrGu+AAAAWklEQVR4nO3PQQ0AIBDAsJODHJTg/4kIHg3JkgnoZu3zdcMFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjx2AQJ7/Hmz/7OEAAAAAElFTkSuQmCC', 'base64') };

async function fillStep(page: Page, index: number, title: string) {
  await page.getByLabel(`Título da etapa ${index}`, { exact: true }).fill(title);
  await page.getByLabel(`Orientação da etapa ${index}`, { exact: true }).fill(`Referência de teste: ${title}.`);
  await page.getByLabel(`Foto da etapa ${index}`, { exact: true }).setInputFiles(photo);
  await expect(page.getByAltText(`Foto selecionada para a etapa ${index}`)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('campo-livre:demo-session', 'active'));
});

test('guia da área salva fotos, reordena, recarrega e permite consulta mobile e ampliação', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/areas/oeste');
  await page.getByRole('button', { name: 'Adicionar orientações', exact: true }).click();
  await page.getByLabel('Ponto de partida', { exact: true }).fill('Recepção de teste');
  await fillStep(page, 1, 'Entrada de teste');
  await page.getByRole('button', { name: '+ Adicionar etapa' }).click();
  await fillStep(page, 2, 'Passagem de teste');
  await page.getByRole('button', { name: 'Mover etapa 2 para cima' }).click();
  await page.getByLabel('Como reconhecer o destino').fill('Identificação de teste na porta.');
  await page.getByRole('button', { name: 'Salvar orientações' }).click();
  await expect(page.getByRole('heading', { name: 'Passagem de teste', exact: true })).toBeVisible();
  await expect(page.locator('.arrival-steps h3').first()).toHaveText('Passagem de teste');
  await page.screenshot({ path: '/tmp/campo-livre-arrival-desktop.png', fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: /Ver caminho/ }).click();
  await expect(page.locator('.arrival-steps h3').first()).toHaveText('Passagem de teste');
  await page.getByRole('button', { name: 'Editar caminho', exact: true }).click();
  await page.getByLabel('Título da etapa 1', { exact: true }).fill('Alteração descartada');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('.arrival-steps h3').first()).toHaveText('Passagem de teste');
  await page.getByLabel('Simular perfil').selectOption('technician');
  await expect(page.getByRole('button', { name: 'Editar caminho', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Ver caminho/ }).click();
  await page.getByRole('button', { name: /Ampliar foto da etapa 1/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.screenshot({ path: '/tmp/campo-livre-arrival-mobile.png', fullPage: true });
  for (const width of [320, 390, 844]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('equipamento tem trecho final próprio e mantém acesso ao caminho da área', async ({ page }) => {
  await page.goto('/#/areas/oeste');
  await page.getByRole('button', { name: 'Adicionar orientações', exact: true }).click();
  await page.getByLabel('Ponto de partida').fill('Partida da área de teste');
  await fillStep(page, 1, 'Acesso à área');
  await page.getByLabel('Como reconhecer o destino').fill('Destino da área');
  await page.getByRole('button', { name: 'Salvar orientações' }).click();
  await page.getByRole('link', { name: /SHW-001/ }).click();
  await page.getByText('Caminho até a área Metalurgia', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acesso à área', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar orientações', exact: true }).click();
  await page.getByLabel('Ponto de partida').fill('Entrada da sala de teste');
  await fillStep(page, 1, 'Encontrar SHW-001');
  await page.getByLabel('Como reconhecer o destino').fill('Etiqueta SHW-001 de teste');
  await page.getByRole('button', { name: 'Salvar orientações' }).click();
  await page.reload();
  await page.getByRole('button', { name: /Ver caminho/ }).click();
  await expect(page.getByRole('heading', { name: 'Encontrar SHW-001', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remover orientações', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar remoção', exact: true }).click();
  await expect(page.getByRole('button', { name: /Ver caminho/ })).toHaveCount(0);
  await page.getByText('Caminho até a área Metalurgia', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acesso à área', exact: true })).toBeVisible();
});

test('edição respeita equipe do supervisor e rejeita foto inválida sem salvar', async ({ page }) => {
  await page.goto('/#/areas/central');
  await page.getByLabel('Simular perfil').selectOption('supervisor');
  await expect(page.getByRole('button', { name: 'Adicionar orientações', exact: true })).toHaveCount(0);
  await page.getByLabel('Equipe de referência').selectOption('eletrica');
  await page.getByRole('button', { name: 'Adicionar orientações', exact: true }).click();
  await page.getByLabel('Foto da etapa 1', { exact: true }).setInputFiles({ name: 'arquivo.txt', mimeType: 'text/plain', buffer: Buffer.from('não é uma foto') });
  await expect(page.getByRole('alert')).toContainText('JPG, PNG ou WebP');
  await page.getByLabel('Ponto de partida').fill('Recepção');
  await page.getByLabel('Título da etapa 1', { exact: true }).fill('Entrada');
  await page.getByLabel('Orientação da etapa 1', { exact: true }).fill('Siga a placa.');
  await page.getByLabel('Como reconhecer o destino').fill('Porta identificada');
  await page.getByRole('button', { name: 'Salvar orientações' }).click();
  await expect(page.getByRole('alert')).toContainText('foto');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByText(/Ainda não há fotos/)).toBeVisible();
});


test('cadastro com foto cabe em celular e em orientação horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/#/areas/leste');
  await page.getByRole('button', { name: 'Adicionar orientações', exact: true }).click();
  await page.getByLabel('Ponto de partida').fill('Ponto de partida de teste');
  await fillStep(page, 1, 'Referência visual de teste');
  await page.getByLabel('Como reconhecer o destino').fill('Placa de teste');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Salvar orientações' }).click();
  await expect(page.getByRole('heading', { name: 'Referência visual de teste', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: /Ampliar foto da etapa 1/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar foto', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Ver caminho/ }).click();
  await expect(page.getByRole('heading', { name: 'Referência visual de teste', exact: true })).toBeVisible();
});
