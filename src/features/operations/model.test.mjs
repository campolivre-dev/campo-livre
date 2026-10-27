import assert from 'node:assert/strict';
import test from 'node:test';
import { applyExecutionAction, createDemoState, getExecutionStatus, getLatestSubmission, parseOperationsState, summarizeExecutions } from './model.ts';

const technician = { role: 'technician', actor: 'Técnico exemplo', at: '2026-09-30T15:00:00Z' };
const supervisor = { role: 'supervisor', actor: 'Supervisor exemplo', at: '2026-10-02T15:00:00Z' };
const report = { executionDate: '2026-09-30', description: 'Verificada a vedação e substituída a peça.', changes: 'Substituição da vedação.', pending: '', photos: [] };
const submit = { type: 'submit', id: 'new-record', equipmentId: 'split-hi-wall-01', kind: 'preventiva', report, context: technician };

test('preventiva só conta após aprovação, no mês da execução e uma única vez', () => {
  const pending = applyExecutionAction({ version: 1, records: [] }, submit);
  assert.equal(summarizeExecutions(pending.records, '2026-09').preventivesThisMonth, 0);
  assert.equal(summarizeExecutions(pending.records).pendingApproval, 1);
  const approved = applyExecutionAction(pending, { type: 'approve', id: submit.id, context: supervisor });
  assert.equal(summarizeExecutions(approved.records, '2026-09').preventivesThisMonth, 1);
  assert.equal(summarizeExecutions(approved.records, '2026-10').preventivesThisMonth, 0);
  assert.throws(() => applyExecutionAction(approved, { type: 'approve', id: submit.id, context: supervisor }), /não está aguardando/);
});

test('devolução exige motivo; correção preserva relatos e decisões anteriores', () => {
  const pending = applyExecutionAction({ version: 1, records: [] }, submit);
  assert.throws(() => applyExecutionAction(pending, { type: 'return', id: submit.id, reason: '   ', context: supervisor }), /motivo/);
  const returned = applyExecutionAction(pending, { type: 'return', id: submit.id, reason: 'Registrar teste após a troca.', context: supervisor });
  assert.equal(getExecutionStatus(returned.records[0]), 'returned');
  assert.equal(summarizeExecutions(returned.records, '2026-09').preventivesThisMonth, 0);
  const corrected = applyExecutionAction(returned, { type: 'resubmit', id: submit.id, report: { ...report, description: 'Vedação trocada e teste concluído.' }, context: { ...technician, at: '2026-10-03T15:00:00Z' } });
  assert.equal(getExecutionStatus(corrected.records[0]), 'pending');
  assert.equal(corrected.records[0].events.length, 3);
  assert.deepEqual(corrected.records[0].events.slice(0, 2), returned.records[0].events);
  assert.equal(pending.records[0].events.length, 1);
  assert.equal(getLatestSubmission(corrected.records[0]).report.description, 'Vedação trocada e teste concluído.');
  assert.equal(corrected.records[0].events[0].report.description, report.description);
});

test('perfis demonstrativos só executam suas transições previstas', () => {
  const pending = applyExecutionAction({ version: 1, records: [] }, submit);
  assert.throws(() => applyExecutionAction(pending, { type: 'approve', id: submit.id, context: technician }), /supervisor/);
  assert.throws(() => applyExecutionAction(pending, { type: 'return', id: submit.id, reason: 'Motivo', context: technician }), /supervisor/);
  assert.throws(() => applyExecutionAction(pending, { type: 'resubmit', id: submit.id, report, context: technician }), /devolvidos/);
  assert.throws(() => applyExecutionAction({ version: 1, records: [] }, { ...submit, context: supervisor }), /perfil de técnico/);
});

test('registro rejeita data impossível ou futura e descrição vazia', () => {
  for (const executionDate of ['2026-02-30', '2026-10-01', 'ontem']) {
    assert.throws(() => applyExecutionAction({ version: 1, records: [] }, { ...submit, report: { ...report, executionDate } }), /data/);
  }
  assert.throws(() => applyExecutionAction({ version: 1, records: [] }, { ...submit, report: { ...report, description: ' ' } }), /Descreva/);
});

test('persistência valida versão e sequência e preserva o histórico completo', () => {
  const state = createDemoState();
  assert.deepEqual(parseOperationsState(JSON.stringify(state)), state);
  assert.throws(() => parseOperationsState(JSON.stringify({ ...state, version: 2 })), /versão/);
  assert.throws(() => parseOperationsState('{corrompido'));
  assert.throws(() => parseOperationsState(JSON.stringify({ version: 1, records: [state.records[0], state.records[0]] })), /versão/);
  const completed = state.records.find((record) => getExecutionStatus(record) === 'completed');
  assert.throws(() => parseOperationsState(JSON.stringify({ version: 1, records: [{ ...completed, events: [...completed.events, completed.events[0]] }] })), /versão/);
});

test('dynamic equipment submits and reloads; deactivation preserves correction and approval history', async () => {
  const { createWorkspaceState, applyWorkspaceAction } = await import('./workspaceModel.ts');
  const admin = { role: 'admin' };
  let catalog = applyWorkspaceAction(createWorkspaceState(), { type: 'addEquipment', id: 'custom', input: { name: 'Equipamento próprio', tag: 'CUSTOM', kind: 'Chiller', areaId: 'oeste', location: '' } }, admin);
  const action = { ...submit, equipmentId: 'custom' };
  let operations = applyExecutionAction({ version: 1, records: [] }, action, catalog);
  assert.deepEqual(parseOperationsState(JSON.stringify(operations)), operations);
  catalog = applyWorkspaceAction(catalog, { type: 'setEquipmentActive', id: 'custom', active: false }, admin);
  assert.throws(() => applyExecutionAction({ version: 1, records: [] }, action, catalog), /ativo/);
  operations = applyExecutionAction(operations, { type: 'return', id: action.id, reason: 'Complementar relato', context: supervisor }, catalog);
  operations = applyExecutionAction(operations, { type: 'resubmit', id: action.id, report, context: technician }, catalog);
  operations = applyExecutionAction(operations, { type: 'approve', id: action.id, context: supervisor }, catalog);
  assert.equal(operations.records[0].events.length, 4);
  assert.equal(operations.records[0].equipmentId, 'custom');
  assert.deepEqual(parseOperationsState(JSON.stringify(operations)), operations);
  catalog = applyWorkspaceAction(catalog, { type: 'setEquipmentActive', id: 'custom', active: true }, admin);
  catalog = applyWorkspaceAction(catalog, { type: 'setAreaActive', id: 'oeste', active: false }, admin);
  assert.throws(() => applyExecutionAction({ version: 1, records: [] }, action, catalog), /área ativa/);
  for (const role of ['admin', 'leader', 'supervisor']) assert.throws(() => applyExecutionAction({ version: 1, records: [] }, { ...action, context: { ...technician, role } }, catalog), /perfil de técnico/);
  const legacy = { ...operations, records: operations.records.map((record) => ({ ...record, equipmentId: 'bomba-01' })) };
  assert.deepEqual(parseOperationsState(JSON.stringify(legacy)), legacy);
});
