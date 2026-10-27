import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });

test('linha começa em movimento enquanto o mapa ainda carrega', async ({ page }, testInfo) => {
  let releaseMap!: () => void;
  const mapLoading = new Promise<void>(resolve => { releaseMap = resolve; });
  await page.route('**/mapScene.ts', async route => {
    await mapLoading;
    await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await expect(page.locator('.screen-power-on')).toBeVisible();
  try {
    const movement = await page.evaluate(() => new Promise<{ initialGrowth: number; longestPause: number }>(resolve => {
      const beam = document.querySelector('.screen-power-beam')!;
      const startedAt = performance.now();
      const initialScale = new DOMMatrixReadOnly(getComputedStyle(beam, '::before').transform).m11;
      let initialGrowth: number | null = null;
      let lastScale = initialScale;
      let movedAt = startedAt;
      let longestPause = 0;
      function sample(now: number) {
        const scale = new DOMMatrixReadOnly(getComputedStyle(beam, '::before').transform).m11;
        longestPause = Math.max(longestPause, now - movedAt);
        if (Math.abs(scale - lastScale) >= .002) {
          lastScale = scale;
          movedAt = now;
        }
        if (initialGrowth === null && now - startedAt >= 400) initialGrowth = scale - initialScale;
        if (now - startedAt >= 2800) {
          resolve({ initialGrowth: initialGrowth!, longestPause });
          return;
        }
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }));
    await testInfo.attach('initial-beam-movement', { body: JSON.stringify({ movement }), contentType: 'application/json' });
    await expect(page.locator('.screen-power-on-ready')).toHaveCount(0);
    expect(movement.initialGrowth, 'A linha precisa crescer desde o início, sem aguardar o carregamento do mapa.').toBeGreaterThan(.05);
    expect(movement.longestPause, 'O movimento deve continuar mesmo se o mapa demorar a carregar.').toBeLessThan(350);

    const handoff = page.evaluate(() => new Promise<number>(resolve => {
      let smallestScale = 1;
      function sample() {
        const beam = document.querySelector('.screen-power-beam');
        if (!beam) {
          resolve(smallestScale);
          return;
        }
        smallestScale = Math.min(smallestScale, new DOMMatrixReadOnly(getComputedStyle(beam, '::before').transform).m11);
        requestAnimationFrame(sample);
      }
      sample();
    }));
    releaseMap();
    expect(await handoff, 'A abertura deve continuar da largura atual, sem reiniciar a linha.').toBeGreaterThan(.7);
  } finally {
    releaseMap();
  }
  await expect(page.locator('.screen-power-on')).toHaveCount(0, { timeout: 20000 });
});

test('linha luminosa abre a tela sem ficar parada ao terminar de crescer', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await expect(page.locator('.screen-power-on')).toBeVisible();

  const pause = await page.evaluate(() => new Promise<number | null>(resolve => {
    let chargedAt: number | null = null;
    function sample(now: number) {
      const beam = document.querySelector('.screen-power-beam');
      const shutter = document.querySelector('.screen-shutter-top');
      if (!beam || !shutter) {
        resolve(null);
        return;
      }
      const beamScale = new DOMMatrixReadOnly(getComputedStyle(beam, '::before').transform).m11;
      const shutterScale = new DOMMatrixReadOnly(getComputedStyle(shutter).transform).m22;
      const ready = document.querySelector('.screen-power-on-ready') !== null;
      if (ready && beamScale >= .99 && chargedAt === null) chargedAt = now;
      if (shutterScale < .99) {
        resolve(chargedAt === null ? null : now - chargedAt);
        return;
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }));
  await testInfo.attach('beam-pause', { body: JSON.stringify({ milliseconds: pause }), contentType: 'application/json' });
  expect(pause, 'O teste deve observar a linha carregada e o início da abertura.').not.toBeNull();
  expect(pause, 'A linha carregada deve abrir a tela sem uma pausa perceptível.').toBeLessThan(250);
});

test('abertura após login revela o mapa em movimento sem uma segunda partida', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await expect(page.locator('.screen-power-on-ready')).toBeVisible({ timeout: 20000 });

  const motion = await page.evaluate(() => new Promise<{
    movedDuringOpening: boolean;
    maxFrameGap: number;
    frames: number;
  }>(resolve => {
    const pin = document.querySelector<HTMLElement>('.map-pin')!;
    const initialPosition = `${pin.style.left}/${pin.style.top}`;
    let movedDuringOpening = false;
    let previousFrame = performance.now();
    let maxFrameGap = 0;
    let frames = 0;
    function sample(now: number) {
      maxFrameGap = Math.max(maxFrameGap, now - previousFrame);
      previousFrame = now;
      frames += 1;
      const shutter = document.querySelector('.screen-shutter-top');
      if (!shutter) {
        resolve({ movedDuringOpening, maxFrameGap, frames });
        return;
      }
      const scale = new DOMMatrixReadOnly(getComputedStyle(shutter).transform).m22;
      if (scale < .98 && scale > .05 && `${pin.style.left}/${pin.style.top}` !== initialPosition) movedDuringOpening = true;
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }));
  await testInfo.attach('intro-motion', { body: JSON.stringify(motion), contentType: 'application/json' });
  expect(motion.movedDuringOpening, 'O mapa deve acompanhar a abertura, sem começar outra animação depois dela.').toBe(true);
  await expect(page.locator('.workspace')).not.toHaveAttribute('inert');
});

test('pular a introdução libera o mapa sem esperar a abertura', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await page.getByRole('button', { name: /Pular animação/ }).click();
  await expect(page.locator('.screen-power-on')).toHaveCount(0);
  await expect(page.locator('.workspace')).not.toHaveAttribute('inert');
  await expect(page.getByRole('button', { name: '2D', exact: true })).toBeEnabled({ timeout: 20000 });
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.getByRole('button', { name: '2D', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('movimento reduzido libera o mapa sem executar a introdução', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await expect(page.locator('.map-viewport')).toHaveAttribute('aria-busy', 'false', { timeout: 20000 });
  await expect(page.locator('.screen-power-on')).toHaveCount(0);
  await expect(page.locator('.workspace')).not.toHaveAttribute('inert');
});
