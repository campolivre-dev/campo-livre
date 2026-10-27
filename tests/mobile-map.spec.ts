import { expect, test } from '@playwright/test';

test.describe('mapa limpo no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });

  test('2D inicial, menu acessível e enquadramento após rotação', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('campo-livre:demo-session', 'active'));
    await page.goto('/#/mapa');
    await expect(page.locator('.map-viewport')).toHaveAttribute('aria-busy', 'false', { timeout: 20000 });
    const canvas = page.locator('.map-renderer canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('aria-label', /Mapa 2D/);
    await expect(page.locator('.workspace-topbar')).toBeHidden();
    await expect(page.locator('.hub-metrics')).toBeHidden();
    await expect(page.locator('.map-bottom-controls')).toBeHidden();
    const menu = page.getByRole('button', { name: 'Abrir menu de navegação' });
    await expect(menu).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden();
    await page.screenshot({ path: '/tmp/campo-livre-mobile-clean.png' });
    await menu.click();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await menu.click();
    await page.getByRole('link', { name: 'Equipes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nossas equipes.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir menu de navegação' })).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Abrir menu de navegação' }).click();
    await page.getByRole('link', { name: 'Mapa', exact: true }).click();
    await expect(page.locator('.map-viewport')).toHaveAttribute('aria-busy', 'false');
    // Pan before rotating: orientation changes must reframe even after manual navigation.
    await page.mouse.move(190, 420);
    await page.mouse.down();
    await page.mouse.move(250, 480, { steps: 6 });
    await page.mouse.up();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(() => canvas.boundingBox()).toEqual({ x: 0, y: 0, width: 844, height: 390 });
    await expect(canvas).toHaveAttribute('aria-label', /Mapa 2D/);
    await expect(page.locator('.workspace-topbar')).toBeHidden();
    await expect(page.locator('.hub-metrics')).toBeHidden();
    await expect(page.locator('.map-bottom-controls')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Abrir menu de navegação' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir área Metalurgia', exact: true })).toBeInViewport();
    await page.screenshot({ path: '/tmp/campo-livre-mobile-landscape.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => canvas.boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Explore a planta' }).click();
    await page.getByRole('searchbox', { name: 'Buscar área' }).fill('Metalurgia');
    await page.getByRole('button', { name: 'Localizar Metalurgia no mapa' }).click();
    await expect(page.getByRole('button', { name: 'Explore a planta' })).toHaveAttribute('aria-expanded', 'false');
    expect(errors).toEqual([]);
  });
});

test('desktop mantém perspectiva 3D com cartões compactos e sem barra de navegação do mapa', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('campo-livre:demo-session', 'active'));
  await page.goto('/#/mapa');
  await expect(page.locator('.map-viewport')).toHaveAttribute('aria-busy', 'false', { timeout: 20000 });
  await expect(page.getByRole('button', { name: '3D', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.workspace-topbar')).toBeVisible();
  await expect(page.locator('.hub-metrics')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aproximar mapa' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Afastar mapa' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Girar mapa à direita' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Restaurar visão geral' })).toHaveCount(0);
  expect((await page.locator('.hub-metrics > a').first().boundingBox())!.height).toBeLessThan(70);
  await expect(page.getByRole('button', { name: 'Abrir menu de navegação' })).toBeHidden();
});
