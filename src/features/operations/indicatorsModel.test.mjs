import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMaintenanceIndicators, UNKNOWN_AREA_ID } from './indicatorsModel.ts';

const catalog = {
  areas: [{ id: 'a', name: 'Área A', active: true }, { id: 'b', name: 'Área B', active: false }],
  equipment: [{ id: 'one', areaId: 'a', active: true }, { id: 'two', areaId: 'b', active: false }, { id: 'orphan', areaId: 'missing', active: true }],
};
const submission = (executionDate) => ({ type: 'submitted', at: `${executionDate}T23:00:00-03:00`, actor: 'Técnico', report: { executionDate, description: 'Relato', changes: '', pending: '', photos: [] } });
const record = (id, date, kind = 'preventiva', equipmentId = 'one', status = 'approved') => ({ id, equipmentId, kind, events: [submission(date), ...(status ? [{ type: status, at: '2026-10-02T00:00:00Z', actor: 'Supervisor', reason: 'Complementar' }] : [])] });

test('approval counts execution month and a resubmission counts once using latest report', () => {
  const corrected = record('corrected', '2026-08-31', 'corretiva', 'one', 'returned');
  corrected.events.push(submission('2026-09-01'), { type: 'approved', at: '2026-10-05T00:00:00Z', actor: 'Supervisor' });
  const result = buildMaintenanceIndicators([record('approved', '2026-09-30'), corrected], catalog, { month: '2026-09' });
  assert.equal(result.summary.completed, 2);
  assert.equal(result.summary.preventiveCompleted, 1);
  assert.equal(result.summary.correctiveCompleted, 1);
  assert.equal(result.monthlyTrend[4].total, 0);
  assert.equal(result.monthlyTrend[5].completed, 2);
  assert.equal(result.records[1], corrected);
});

test('six-month range includes boundaries across year and fills zero months', () => {
  const result = buildMaintenanceIndicators([record('start', '2025-09-01'), record('before', '2025-08-31'), record('end', '2026-02-28'), record('after', '2026-03-01')], catalog, { month: '2026-02' });
  assert.deepEqual(result.monthlyTrend.map(({ month, completed }) => [month, completed]), [['2025-09', 1], ['2025-10', 0], ['2025-11', 0], ['2025-12', 0], ['2026-01', 0], ['2026-02', 1]]);
  assert.equal(result.summary.total, 1);
});

test('inactive equipment and missing catalog retain history with unknown area filter', () => {
  const records = [record('inactive', '2026-09-01', 'preventiva', 'two'), record('missing-equipment', '2026-09-02', 'inspecao', 'absent'), record('missing-area', '2026-09-03', 'corretiva', 'orphan')];
  const result = buildMaintenanceIndicators(records, catalog, { month: '2026-09' });
  assert.equal(result.summary.completed, 3);
  assert.equal(result.summary.inspectionCompleted, 1);
  assert.equal(result.byArea.find((area) => area.areaId === 'b').completed, 1);
  const unknown = buildMaintenanceIndicators(records, catalog, { month: '2026-09', areaId: UNKNOWN_AREA_ID });
  assert.equal(unknown.summary.total, 2);
  assert.equal(unknown.byArea[0].areaName, 'Área não encontrada');
});

test('area and kind affect all results while selected month limits summary, area and detail', () => {
  const records = [record('pending', '2026-09-01', 'preventiva', 'one', null), record('returned', '2026-09-02', 'preventiva', 'one', 'returned'), record('older', '2026-08-01'), record('other-kind', '2026-09-03', 'corretiva'), record('other-area', '2026-09-04', 'preventiva', 'two')];
  const result = buildMaintenanceIndicators(records, catalog, { month: '2026-09', areaId: 'a', kind: 'preventiva' });
  assert.deepEqual(result.summary, { total: 2, completed: 0, preventiveCompleted: 0, correctiveCompleted: 0, inspectionCompleted: 0, pendingApproval: 1, returned: 1 });
  assert.equal(result.byArea.length, 1);
  assert.equal(result.byArea[0].total, 2);
  assert.deepEqual(result.records.map(({ id }) => id), ['pending', 'returned']);
  assert.equal(result.monthlyTrend[4].completed, 1);
  assert.equal(result.monthlyTrend[5].total, 2);
});

test('empty results are zeros and invalid month is rejected', () => {
  const result = buildMaintenanceIndicators([], catalog, { month: '2026-09' });
  assert.equal(result.summary.total, 0);
  assert.equal(result.monthlyTrend.length, 6);
  assert.ok(result.monthlyTrend.every((entry) => entry.total === 0));
  assert.deepEqual(result.byArea, []);
  assert.deepEqual(result.records, []);
  for (const month of ['2026-13', '2026-00', '2026-9', 'invalid']) assert.throws(() => buildMaintenanceIndicators([], catalog, { month }), /mês válido/);
});
