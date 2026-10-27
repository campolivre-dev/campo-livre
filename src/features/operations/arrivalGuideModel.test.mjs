import test from 'node:test';
import assert from 'node:assert/strict';
import { validateArrivalGuide, MAX_ARRIVAL_PHOTO_BYTES } from './arrivalGuideModel.ts';
import { createWorkspaceState, applyWorkspaceAction, parseWorkspaceState } from './workspaceModel.ts';
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAoCAIAAADBrGu+AAAAWklEQVR4nO3PQQ0AIBDAsJODHJTg/4kIHg3JkgnoZu3zdcMFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjx2AQJ7/Hmz/7OEAAAAAElFTkSuQmCC';
const guide = () => ({ startingPoint: ' Recepção ', destination: 'Porta identificada', steps: [{ id: 'step-1', title: 'Passagem sinalizada', instruction: 'Siga a referência cadastrada.', photo }] });
const admin = { role: 'admin' };
const save = (state, entity, id, access = admin, value = guide()) => applyWorkspaceAction(state, { type: 'setArrivalGuide', entity, id, guide: value }, access);

test('guide survives reload without changing old records and preserves photo step order', () => {
  const state = createWorkspaceState();
  const old = parseWorkspaceState(JSON.stringify(state));
  assert.equal(old.areas[0].arrivalGuide, undefined);
  const area = state.areas[0];
  const asset = state.equipment.find(item => item.areaId === area.id);
  let next = save(state, 'area', area.id);
  next = save(next, 'equipment', asset.id);
  const reloaded = parseWorkspaceState(JSON.stringify(next));
  assert.equal(reloaded.areas[0].arrivalGuide.startingPoint, 'Recepção');
  assert.equal(reloaded.equipment.find(item => item.id === asset.id).arrivalGuide.steps[0].photo, photo);
  assert.equal(state.areas[0].arrivalGuide, undefined);
  const removed = save(next, 'area', area.id, admin, null);
  assert.equal(removed.areas[0].arrivalGuide, undefined);
  assert.ok(removed.equipment.find(item => item.id === asset.id).arrivalGuide);
});

test('only administrator and supervisor assigned to the area can edit; inactive locations are read-only', () => {
  const state = createWorkspaceState();
  const team = state.teams[0];
  const otherArea = state.areas.find(area => area.id !== team.areaId);
  const supervisor = { role: 'supervisor', teamId: team.id };
  assert.ok(save(state, 'area', team.areaId, supervisor).areas.find(area => area.id === team.areaId).arrivalGuide);
  for (const access of [{ role: 'technician' }, { role: 'leader' }, { role: 'supervisor' }]) assert.throws(() => save(state, 'area', team.areaId, access), /permissão/);
  assert.throws(() => save(state, 'area', otherArea.id, supervisor), /permissão/);
  const asset = state.equipment.find(item => item.areaId === otherArea.id);
  assert.throws(() => save(state, 'equipment', asset.id, supervisor), /permissão/);
  const inactive = applyWorkspaceAction(state, { type: 'setAreaActive', id: team.areaId, active: false }, admin);
  assert.throws(() => save(inactive, 'area', team.areaId), /Reative/);
});

test('validation rejects missing photos, external URLs, oversized photos and duplicate or incomplete steps', () => {
  assert.throws(() => validateArrivalGuide({ ...guide(), steps: [] }), /etapas/);
  assert.throws(() => validateArrivalGuide({ ...guide(), startingPoint: '' }), /partida/);
  for (const invalid of ['', 'https://example.com/photo.jpg', 'data:image/svg+xml;base64,PHN2Zz4=', `data:image/jpeg;base64,${'A'.repeat(MAX_ARRIVAL_PHOTO_BYTES * 2)}`]) {
    assert.throws(() => validateArrivalGuide({ ...guide(), steps: [{ ...guide().steps[0], photo: invalid }] }), /foto/);
  }
  assert.throws(() => validateArrivalGuide({ ...guide(), steps: [guide().steps[0], guide().steps[0]] }), /duplicada/);
  assert.throws(() => validateArrivalGuide({ ...guide(), steps: [{ ...guide().steps[0], instruction: '' }] }), /orientação/);
  const invalidState = createWorkspaceState(); invalidState.areas[0].arrivalGuide = { ...guide(), destination: '' };
  assert.throws(() => parseWorkspaceState(JSON.stringify(invalidState)), /destino/);
});

test('equipment transfer clears the guide tied to the previous area, without changing area guides', () => {
  let state = createWorkspaceState();
  const asset = state.equipment[0];
  state = save(state, 'equipment', asset.id);
  state = save(state, 'area', asset.areaId);
  const otherArea = state.areas.find(area => area.id !== asset.areaId && area.active);
  const next = applyWorkspaceAction(state, { type: 'updateEquipment', id: asset.id, input: { ...asset, areaId: otherArea.id } }, admin);
  assert.equal(next.equipment[0].arrivalGuide, undefined);
  assert.ok(next.areas.find(area => area.id === asset.areaId).arrivalGuide);
});
