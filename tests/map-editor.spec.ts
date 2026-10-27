import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function enterMap(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await expect(page.locator('.map-viewport')).toHaveAttribute('aria-busy', 'false', { timeout: 20000 });
  await expect(page.locator('.screen-power-on')).toHaveCount(0);
}

async function pickNearArea(page: Page, dx = -40, dy = 48, area = 'Metalurgia') {
  const anchor = await page.getByRole('button', { name: `Abrir área ${area}`, exact: true }).boundingBox();
  if (!anchor) throw new Error('Marcador de referência não está visível.');
  await page.mouse.click(anchor.x + anchor.width / 2 + dx, anchor.y + anchor.height + dy);
  await expect(page.getByRole('img', { name: 'Posição escolhida para o marcador' })).toBeVisible();
}

async function removeSelected(page: Page) {
  await page.getByRole('button', { name: 'Remover do mapa', exact: true }).click();
  await expect(page.getByText(/O cadastro e o histórico de manutenção serão preservados/)).toBeVisible();
  await page.getByRole('button', { name: 'Remover do mapa', exact: true }).click();
}

test('cria, move, remove e restaura setor em3D preservando cadastro após recarregar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await enterMap(page);
  await page.getByRole('button', { name: 'Editar mapa', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar setor', exact: true }).click();
  await pickNearArea(page);
  await page.getByLabel('Nome do setor', { exact: true }).fill('Oficina central');
  await page.getByRole('button', { name: 'Adicionar setor', exact: true }).click();
  const marker = page.getByRole('button', { name: 'Abrir área Oficina central', exact: true });
  await expect(marker).toBeVisible();
  const previousU = await marker.getAttribute('data-u');
  await page.locator('.map-editor-list button').filter({ hasText: 'Oficina central' }).click();
  await page.getByRole('button', { name: 'Mover marcador' }).click();
  await pickNearArea(page, -70, 70);
  await page.getByRole('button', { name: 'Confirmar posição' }).click();
  await expect(marker).not.toHaveAttribute('data-u', previousU!);
  const movedU = await marker.getAttribute('data-u');
  await page.reload();
  await expect(marker).toBeVisible();
  await expect(marker).toHaveAttribute('data-u', movedU!);
  await page.getByRole('button', { name: 'Editar mapa', exact: true }).click();
  await page.locator('.map-editor-list button').filter({ hasText: 'Oficina central' }).click();
  await removeSelected(page);
  await expect(marker).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.map-viewport')).toHaveAttribute('aria-busy', 'false', { timeout: 20000 });
  await expect(marker).toHaveCount(0);
  await page.getByRole('link', { name: 'Áreas', exact: true }).click();
  const card = page.locator('.directory-card').filter({ has: page.getByRole('heading', { name: 'Oficina central', exact: true }) });
  await card.getByRole('button', { name: 'Abrir área', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Oficina central.' })).toBeVisible();
  await expect(page.getByText('Este setor ainda não tem equipamentos cadastrados.')).toBeVisible();
  await page.getByRole('link', { name: 'Mapa', exact: true }).click();
  await page.getByRole('button', { name: 'Editar mapa', exact: true }).click();
  await page.getByText('Removidos do mapa (1)', { exact: true }).click();
  await page.getByRole('button', { name: 'Restaurar Oficina central no mapa' }).click();
  await expect(marker).toBeVisible();
  await expect(marker).toHaveAttribute('data-u', movedU!);
  await page.screenshot({ path: '/tmp/campo-livre-editor-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('equipe adicionada aparece no cadastro e remoção preserva supervisor e setor', async ({ page }) => {
  await enterMap(page);
  await page.getByRole('button', { name: 'Editar mapa', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar equipe', exact: true }).click();
  await pickNearArea(page, -55, 55);
  await page.getByLabel('Nome da equipe', { exact: true }).fill('Equipe de refrigeração');
  await page.getByLabel('Supervisor', { exact: true }).fill('Renata');
  await page.getByLabel('Setor designado', { exact: true }).selectOption('leste');
  await page.getByLabel('Colaboradores (opcional)', { exact: true }).fill('Paulo, Beatriz');
  await page.getByLabel('Imagem da equipe', { exact: true }).selectOption('/images/teams/yuri.png');
  await page.getByRole('button', { name: 'Adicionar equipe', exact: true }).click();
  const marker = page.locator('.map-team-pin').filter({ hasText: 'Equipe de refrigeração' });
  await expect(marker).toBeVisible();
  await page.locator('.map-editor-list button').filter({ hasText: 'Equipe de refrigeração' }).click();
  await removeSelected(page);
  await expect(marker).toHaveCount(0);
  await page.getByRole('link', { name: 'Equipes', exact: true }).click();
  const card = page.locator('.team-card').filter({ has: page.getByRole('heading', { name: 'Renata', exact: true }) });
  await expect(card).toBeVisible();
  await expect(card.getByRole('listitem').filter({ hasText: 'Paulo' })).toBeVisible();
  await expect(card.locator('img')).toHaveAttribute('src', '/images/teams/yuri.png');
  await card.getByRole('link', { name: 'Obras', exact: true }).click();
  await expect(page.locator('.op-team-supervisor').filter({ hasText: 'Renata' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.op-team-supervisor').filter({ hasText: 'Renata' })).toBeVisible();
});

test('arrastar o mapa durante inserção não cria ponto e mobile permite adicionar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterMap(page);
  await page.getByRole('button', { name: 'Editar mapa', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar setor', exact: true }).click();
  await page.mouse.move(70, 340);
  await page.mouse.down();
  await page.mouse.move(105, 350, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByLabel('Nome do setor', { exact: true })).toHaveCount(0);
  await pickNearArea(page, -25, 35, 'Aços Longos');
  await page.getByLabel('Nome do setor', { exact: true }).fill('Oficina móvel');
  await page.getByRole('button', { name: 'Adicionar setor', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir área Oficina móvel', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/campo-livre-editor-mobile.png', fullPage: true });
});

test('remoção de setor mantém equipamentos e histórico; fallback permite reposicionar', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    };
  });
  await enterMap(page);
  await page.getByRole('button', { name: 'Editar mapa', exact: true }).click();
  await page.locator('.map-editor-list button').filter({ hasText: 'Metalurgia' }).click();
  await removeSelected(page);
  await expect(page.getByRole('button', { name: 'Abrir área Metalurgia', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Áreas', exact: true }).click();
  await page.locator('.directory-card').filter({ has: page.getByRole('heading', { name: 'Metalurgia', exact: true }) }).getByRole('button', { name: 'Abrir área' }).click();
  await page.getByRole('link', { name: /Split Hi-Wall/ }).click();
  await expect(page.locator('.op-record')).toHaveCount(2);
  await page.getByRole('link', { name: 'Mapa', exact: true }).click();
  await page.getByRole('button', { name: 'Editar mapa', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar setor', exact: true }).click();
  await page.locator('.map-fallback-image').click({ position: { x: 550, y: 350 } });
  await page.getByLabel('Nome do setor', { exact: true }).fill('Setor auxiliar');
  await page.getByRole('button', { name: 'Adicionar setor', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir área Setor auxiliar', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Abrir área Setor auxiliar', exact: true })).toBeVisible();
});
