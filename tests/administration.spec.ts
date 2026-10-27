import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function enterAdministration(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => window.sessionStorage.setItem('campo-livre:demo-session', 'active'));
  await page.goto('/#/cadastros');
  await expect(page.getByRole('heading', { name: 'Cadastros.' })).toBeVisible();
}

function record(page: Page, name: string) {
  return page.locator('.admin-record').filter({ has: page.getByRole('heading', { name, exact: true }) });
}

async function confirmStatus(page: Page, name: string, active: boolean) {
  await record(page, name).getByRole('button', { name: active ? 'Inativar' : 'Reativar', exact: true }).click();
  await expect(page.getByRole('heading', { name: `${active ? 'Inativar' : 'Reativar'} ${name}?` })).toBeVisible();
  await page.getByRole('button', { name: active ? 'Confirmar inativação' : 'Confirmar reativação' }).click();
}

test('admin mantém áreas e colaboradores; cargo e perfil independem e a equipe reflete situação', async ({ page }) => {
  await enterAdministration(page);
  await page.getByRole('button', { name: 'Adicionar área', exact: false }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Oficina de apoio');
  await page.getByLabel('Descrição').fill('Área cadastrada pelo administrador.');
  await page.getByRole('button', { name: 'Salvar área' }).click();
  await record(page, 'Oficina de apoio').getByRole('button', { name: 'Editar área Oficina de apoio', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Oficina de climatização');
  await page.getByRole('button', { name: 'Salvar área' }).click();
  await confirmStatus(page, 'Oficina de climatização', true);
  await page.reload();
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('inactive');
  await expect(record(page, 'Oficina de climatização')).toContainText('Área cadastrada pelo administrador.');
  await confirmStatus(page, 'Oficina de climatização', false);
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('active');
  await expect(record(page, 'Oficina de climatização')).toBeVisible();

  await page.getByRole('tab', { name: 'Colaboradores', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar colaborador', exact: false }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Renata Teste');
  await page.getByRole('combobox', { name: 'Cargo profissional', exact: true }).selectOption('Líder');
  await page.getByRole('combobox', { name: 'Perfil de acesso', exact: true }).selectOption('technician');
  await page.getByRole('combobox', { name: 'Equipe', exact: true }).selectOption('mecanica');
  await expect(page.getByLabel('Supervisor da equipe')).toHaveValue('Silverio');
  await page.getByRole('button', { name: 'Salvar colaborador' }).click();
  await expect(record(page, 'Renata Teste')).toContainText('Líder');
  await expect(record(page, 'Renata Teste')).toContainText('Técnico');
  await record(page, 'Renata Teste').getByRole('button', { name: 'Editar colaborador Renata Teste' }).click();
  await page.getByRole('combobox', { name: 'Cargo profissional', exact: true }).selectOption('Eletromecânico 2');
  await expect(page.getByRole('combobox', { name: 'Perfil de acesso', exact: true })).toHaveValue('technician');
  await page.getByRole('button', { name: 'Salvar colaborador' }).click();
  await page.getByRole('link', { name: 'Equipes', exact: true }).click();
  await expect(page.locator('.team-members').getByText('Renata Teste', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Cadastros', exact: true }).click();
  await page.getByRole('tab', { name: 'Colaboradores', exact: true }).click();
  await confirmStatus(page, 'Renata Teste', true);
  await page.reload();
  await page.getByRole('tab', { name: 'Colaboradores', exact: true }).click();
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('inactive');
  await expect(record(page, 'Renata Teste')).toContainText('Eletromecânico 2');
  await page.getByRole('link', { name: 'Equipes', exact: true }).click();
  await expect(page.locator('.team-members').getByText('Renata Teste', { exact: false })).toHaveCount(0);
  await page.getByRole('link', { name: 'Cadastros', exact: true }).click();
  await page.getByRole('tab', { name: 'Colaboradores', exact: true }).click();
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('inactive');
  await confirmStatus(page, 'Renata Teste', false);
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('active');
  await page.getByRole('searchbox', { name: 'Buscar colaboradores' }).fill('Renata');
  await expect(record(page, 'Renata Teste')).toBeVisible();
  await page.screenshot({ path: '/tmp/campo-livre-admin-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Equipes', exact: true }).click();
  await expect(page.locator('.team-members').getByText('Renata Teste', { exact: false })).toBeVisible();
});

test('equipamento cadastrado recebe execução e inativação preserva histórico após recarregar', async ({ page }) => {
  await enterAdministration(page);
  await page.getByRole('tab', { name: 'Equipamentos', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar equipamento', exact: false }).click();
  await page.getByRole('combobox', { name: 'Tipo de equipamento', exact: true }).selectOption('Fan Coil');
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Fan Coil');
  await page.getByLabel('Nome', { exact: true }).fill('Fan Coil da oficina');
  await page.getByLabel('Identificação (tag)', { exact: true }).fill('FC-E2E-001');
  await page.getByRole('combobox', { name: 'Área', exact: true }).selectOption('oeste');
  await page.getByLabel('Localização (opcional)', { exact: true }).fill('Sala técnica');
  await page.getByRole('button', { name: 'Salvar equipamento' }).click();
  await expect(record(page, 'Fan Coil da oficina')).toContainText('FC-E2E-001');
  await record(page, 'Fan Coil da oficina').getByRole('button', { name: 'Ver histórico' }).click();
  const historyUrl = page.url();
  await page.getByRole('combobox', { name: 'Simular perfil', exact: true }).selectOption('technician');
  await page.getByRole('button', { name: /Registrar execução/ }).click();
  await page.getByLabel('Trabalho realizado').fill('Filtro limpo e vazão do Fan Coil verificada.');
  await page.getByRole('button', { name: 'Enviar para aprovação', exact: true }).click();
  await expect(page.getByText('Aguardando aprovação', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Simular perfil', exact: true }).selectOption('admin');
  await page.getByRole('link', { name: 'Cadastros', exact: true }).click();
  await page.getByRole('tab', { name: 'Equipamentos', exact: true }).click();
  await confirmStatus(page, 'Fan Coil da oficina', true);
  await page.getByRole('link', { name: 'Ativos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fan Coil da oficina', exact: true })).toHaveCount(0);
  await page.getByLabel('Incluir equipamentos e áreas inativos').check();
  await expect(page.getByRole('heading', { name: 'Fan Coil da oficina', exact: true })).toBeVisible();
  await page.goto(historyUrl);
  await page.reload();
  const savedReport = page.locator('.op-report-description').filter({ hasText: /^Filtro limpo e vazão do Fan Coil verificada\.$/ });
  await expect(savedReport).toBeVisible();
  await page.getByRole('combobox', { name: 'Simular perfil', exact: true }).selectOption('technician');
  await expect(page.getByRole('button', { name: /Registrar execução/ })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Simular perfil', exact: true }).selectOption('admin');
  await page.getByRole('link', { name: 'Cadastros', exact: true }).click();
  await page.getByRole('tab', { name: 'Equipamentos', exact: true }).click();
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('inactive');
  await confirmStatus(page, 'Fan Coil da oficina', false);
  await page.getByRole('link', { name: 'Ativos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fan Coil da oficina', exact: true })).toBeVisible();
});

test('transferir equipamento legado atualiza as áreas e mantém o acesso ao histórico após recarregar', async ({ page }) => {
  await enterAdministration(page);
  await page.getByRole('tab', { name: 'Equipamentos', exact: true }).click();
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('inactive');
  await record(page, 'Bomba de circulação').getByRole('button', { name: 'Editar equipamento Bomba de circulação' }).click();
  await page.getByRole('combobox', { name: 'Tipo de equipamento', exact: true }).selectOption('Chiller');
  await page.getByRole('combobox', { name: 'Área', exact: true }).selectOption('central');
  await page.getByRole('button', { name: 'Salvar equipamento' }).click();
  await page.reload();

  await page.goto('/#/areas/oeste');
  await expect(page.getByRole('heading', { name: 'Metalurgia.', exact: true })).toBeVisible();
  await expect(page.locator('.op-equipment-card').filter({ hasText: 'BMB-001' })).toHaveCount(0);
  await page.goto('/#/areas/central');
  await page.locator('.op-equipment-card').filter({ hasText: 'BMB-001' }).click();
  await expect(page).toHaveURL(/#\/areas\/central\/equipamentos\/bomba-01$/);
  await expect(page.getByRole('heading', { name: 'Bomba de circulação.', exact: true })).toBeVisible();
});

test('perfis restringem cadastros, organização e marcadores à responsabilidade permitida', async ({ page }) => {
  await enterAdministration(page);
  for (const role of ['supervisor', 'leader', 'technician']) {
    await page.getByRole('combobox', { name: 'Simular perfil', exact: true }).selectOption(role);
    await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cadastros', exact: true })).toHaveCount(0);
    await expect(page.locator('.admin-editor')).toHaveCount(0);
    await expect(page.getByRole('tab')).toHaveCount(0);
  }
  await page.getByRole('combobox', { name: 'Simular perfil', exact: true }).selectOption('supervisor');
  await page.getByRole('combobox', { name: 'Equipe de referência', exact: true }).selectOption('mecanica');
  await page.getByRole('link', { name: 'Equipes', exact: true }).click();
  await expect(page.getByRole('button', { name: /Organizar equipe/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Organizar equipe Equipe Silverio', exact: true }).click();
  await page.getByRole('combobox', { name: 'Área designada', exact: true }).selectOption('central');
  await page.getByRole('button', { name: 'Salvar organização' }).click();
  await expect(page.locator('.team-card').filter({ has: page.getByRole('heading', { name: 'Silverio', exact: true }) }).getByRole('link', { name: 'Aços Longos', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Equipe de referência', exact: true }).selectOption('utilidades');
  await expect(page.getByRole('button', { name: 'Organizar equipe Equipe Yuri', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Organizar equipe Equipe Silverio', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Mapa', exact: true }).click();
  await page.getByRole('button', { name: 'Editar mapa', exact: true }).click();
  await expect(page.locator('.map-editor-list button')).toHaveCount(1);
  await expect(page.locator('.map-editor-list')).toContainText('Equipe Yuri');
  await expect(page.getByRole('button', { name: 'Adicionar setor', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Adicionar equipe', exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Simular perfil', exact: true }).selectOption('leader');
  await expect(page.getByRole('button', { name: 'Editar mapa', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Equipes', exact: true }).click();
  await expect(page.getByRole('button', { name: /Organizar equipe/ })).toHaveCount(0);
});

test('cadastros e formulários cabem no mobile com navegação acessível por abas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterAdministration(page);
  for (const [tab, add] of [['Áreas', 'Adicionar área'], ['Colaboradores', 'Adicionar colaborador'], ['Equipamentos', 'Adicionar equipamento']]) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await page.getByRole('button', { name: add, exact: false }).click();
    await expect(page.getByLabel('Nome', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (tab === 'Equipamentos') await page.screenshot({ path: '/tmp/campo-livre-admin-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
  await page.getByRole('tab', { name: 'Equipamentos', exact: true }).focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Áreas', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Colaboradores', exact: true })).toHaveAttribute('aria-selected', 'true');
});
