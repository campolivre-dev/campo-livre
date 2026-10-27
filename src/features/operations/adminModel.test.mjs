import assert from 'node:assert/strict';
import test from 'node:test';
import { applyWorkspaceAction, createWorkspaceState, deriveWorkspace, parseWorkspaceState } from './workspaceModel.ts';
const admin = { role: 'admin' };
const supervisor = { role: 'supervisor', teamId: 'mecanica' };
const apply = (state, action, access = admin) => applyWorkspaceAction(state, action, access);

test('official areas retain legacy references and inactive markers return at their saved position', () => {
  const initial = createWorkspaceState();
  assert.deepEqual(initial.areas.filter((area) => area.active).map((area) => area.name), ['Metalurgia', 'Aços Longos', 'Obras']);
  const hidden = apply(initial, { type: 'hideMarker', id: 'area:norte' });
  assert.equal(deriveWorkspace(hidden).hiddenMarkers.length, 0);
  const restored = apply(hidden, { type: 'setAreaActive', id: 'norte', active: true });
  assert.deepEqual(deriveWorkspace(restored).hiddenMarkers[0].position, [0.44, 0.27]);
  assert.deepEqual(restored.areas.find((a) => a.id === 'norte').equipmentIds, ['transportador-01']);
  assert.throws(() => apply(initial, { type: 'setTeamArea', id: 'mecanica', areaId: 'norte' }), /ativa/);
  const withoutArea = apply(initial, { type: 'setAreaActive', id: 'oeste', active: false });
  assert.deepEqual(withoutArea.teams, initial.teams);
  assert.deepEqual(withoutArea.collaborators, initial.collaborators);
  assert.deepEqual(withoutArea.markers, initial.markers);
});

test('administrator creates unplaced areas and edits names without moving markers', () => {
  let state = apply(createWorkspaceState(), { type: 'addArea', id: 'new', input: { name: ' Nova área ' } });
  assert.equal(deriveWorkspace(state).hiddenMarkers[0].label, 'Nova área');
  const markers = state.markers;
  state = apply(state, { type: 'updateArea', id: 'new', input: { name: ' Renomeada ', description: ' descrição ' } });
  assert.equal(state.areas.at(-1).description, 'descrição');
  assert.deepEqual(state.markers, markers);
  assert.deepEqual(parseWorkspaceState(JSON.stringify(state)), state);
});

test('access profiles are enforced in model and supervisor can organize only own team', () => {
  const state = createWorkspaceState();
  const changes = [
    { type: 'addArea', id: 'new', input: { name: 'Nova' } },
    { type: 'setAreaActive', id: 'oeste', active: false },
    { type: 'updateArea', id: 'oeste', input: { name: 'X', description: '' } },
    { type: 'setCollaboratorActive', id: 'member:mecanica:0', active: false },
    { type: 'moveMarker', id: 'area:oeste', position: [0, 0] },
    { type: 'hideMarker', id: 'team:eletrica' },
    { type: 'setTeamArea', id: 'eletrica', areaId: 'oeste' },
    { type: 'assignCollaborator', id: 'member:eletrica:0', teamId: 'mecanica' },
    { type: 'assignCollaborator', id: 'member:mecanica:0', teamId: 'eletrica' },
  ];
  for (const action of changes) {
    for (const access of [supervisor, { role: 'leader' }, { role: 'technician' }]) assert.throws(() => apply(state, action, access), /permissão/);
    assert.throws(() => applyWorkspaceAction(state, action), /permissão/);
  }
  assert.equal(apply(state, { type: 'setTeamArea', id: 'mecanica', areaId: 'leste' }, supervisor).teams[0].areaId, 'leste');
  let changed = apply(state, { type: 'assignCollaborator', id: 'member:mecanica:0', teamId: null }, supervisor);
  changed = apply(changed, { type: 'assignCollaborator', id: 'member:mecanica:0', teamId: 'mecanica' }, supervisor);
  changed = apply(changed, { type: 'moveMarker', id: 'team:mecanica', position: [0, 1] }, supervisor);
  assert.deepEqual(changed.markers.find((m) => m.id === 'team:mecanica').position, [0, 1]);
});

test('job and access are independent; inactivation preserves assignment and removes active roster only', () => {
  let state = createWorkspaceState();
  assert.equal(deriveWorkspace(state).teams.reduce((sum, team) => sum + team.members.length, 0), 10);
  const person = state.collaborators[0];
  state = apply(state, { type: 'updateCollaborator', id: person.id, input: { ...person, name: ' Ana ', jobTitle: 'Supervisor' } });
  assert.equal(state.collaborators[0].accessRole, 'technician');
  assert.equal(deriveWorkspace(state).teams[0].members.length, 5);
  state = apply(state, { type: 'setCollaboratorActive', id: person.id, active: false });
  assert.equal(state.collaborators[0].teamId, 'mecanica');
  assert.equal(deriveWorkspace(state).teams[0].members.length, 4);
  assert.throws(() => apply(state, { type: 'assignCollaborator', id: person.id, teamId: null }), /Reative/);
  assert.deepEqual(parseWorkspaceState(JSON.stringify(state)), state);
});

test('v1 migration preserves custom records, references, arbitrary fields, markers and history', () => {
  const base = createWorkspaceState();
  const legacy = { version: 1, addedAreas: [{ id: 'custom', name: 'Meu setor', description: 'Descrição', position: [0.1, 0.2], equipmentIds: ['custom-machine'], teamIds: ['custom-team'], customNote: 'preserve' }], addedTeams: [{ id: 'custom-team', name: 'Meu time', supervisor: 'Pessoa', areaId: 'custom', members: ['Um', 'Dois'], image: '/custom.png', imageAlt: 'Custom image', customNote: 'preserve' }], markers: [...base.markers, { id: 'area:custom', position: [0.9, 0.8], hidden: true }, { id: 'team:custom-team', position: [0.3, 0.7], hidden: false }], operationHistory: [{ text: 'untouched' }] };
  const migrated = parseWorkspaceState(JSON.stringify(legacy));
  assert.deepEqual(parseWorkspaceState(JSON.stringify(legacy)), migrated);
  assert.deepEqual(migrated.markers, legacy.markers);
  assert.deepEqual(migrated.operationHistory, legacy.operationHistory);
  assert.equal(migrated.areas.at(-1).customNote, 'preserve');
  assert.equal(migrated.teams.at(-1).image, '/custom.png');
  assert.deepEqual(deriveWorkspace(migrated).teams.at(-1).members, ['Um', 'Dois']);
  assert.deepEqual(migrated.collaborators.filter((p) => p.teamId === 'custom-team').map((p) => p.id), ['member:custom-team:0', 'member:custom-team:1', 'supervisor:custom-team']);
  assert.deepEqual(parseWorkspaceState(JSON.stringify(migrated)), migrated);
});

test('responsible name follows collaborator edit and stable responsible cannot be reassigned', () => {
  const state = createWorkspaceState();
  const person = state.collaborators.find((person) => person.id === 'supervisor:mecanica');
  const renamed = apply(state, { type: 'updateCollaborator', id: person.id, input: { ...person, name: 'Nome atualizado' } });
  assert.equal(deriveWorkspace(renamed).teams[0].supervisor, 'Nome atualizado');
  assert.throws(() => apply(state, { type: 'assignCollaborator', id: person.id, teamId: null }), /responsável/);
  assert.throws(() => apply(state, { type: 'updateCollaborator', id: person.id, input: { ...person, teamId: 'eletrica' } }), /responsável/);
  const inactive = apply(state, { type: 'setAreaActive', id: 'central', active: false });
  assert.throws(() => apply(inactive, { type: 'assignCollaborator', id: 'member:mecanica:0', teamId: 'eletrica' }), /ativa/);
  assert.throws(() => apply(inactive, { type: 'addCollaborator', id: 'new', input: { name: 'Pessoa', jobTitle: 'Técnico', accessRole: 'technician', teamId: 'eletrica' } }), /ativa/);
  const existing = inactive.collaborators.find((person) => person.id === 'member:eletrica:0');
  assert.doesNotThrow(() => apply(inactive, { type: 'updateCollaborator', id: existing.id, input: { ...existing, name: 'Atualizado' } }));
});

test('equipment CRUD enforces profiles, unique tags, types and active assignment while preserving history identities', () => {
  let state = createWorkspaceState();
  assert.equal(state.equipment.filter((item) => item.active).length, 7);
  assert.equal(state.equipment.filter((item) => !item.active).length, 6);
  assert.equal(state.equipment.find((item) => item.id === 'bomba-01').name, 'Bomba de circulação');
  const input = { name: ' Custom ', tag: ' CUSTOM-001 ', kind: 'Chiller', areaId: 'oeste', location: ' Sala ' };
  const add = { type: 'addEquipment', id: 'custom-equipment', input };
  for (const role of ['supervisor', 'leader', 'technician']) assert.throws(() => apply(state, add, { role }), /permissão/);
  state = apply(state, add);
  assert.equal(state.equipment.at(-1).location, 'Sala');
  assert.throws(() => apply(state, { ...add, id: 'other', input: { ...input, tag: 'custom-001' } }), /identificação/);
  assert.throws(() => apply(state, { ...add, id: 'other', input: { ...input, kind: 'Unknown' } }), /tipo/);
  assert.throws(() => apply(state, { ...add, id: 'other', input: { ...input, areaId: 'norte' } }), /ativa/);
  state = apply(state, { type: 'updateEquipment', id: add.id, input: { ...input, areaId: 'central', name: 'Renomeado' } });
  state = apply(state, { type: 'setEquipmentActive', id: add.id, active: false });
  assert.equal(state.equipment.at(-1).name, 'Renomeado');
  assert.equal(state.equipment.at(-1).areaId, 'central');
  assert.deepEqual(parseWorkspaceState(JSON.stringify(state)), state);
  const v2 = { ...state, version: 2 };
  delete v2.equipment;
  const migrated = parseWorkspaceState(JSON.stringify(v2));
  assert.equal(migrated.version, 3);
  assert.equal(migrated.equipment.length, 13);
  assert.deepEqual(migrated.markers, state.markers);
  assert.deepEqual(migrated.collaborators, state.collaborators);
});

test('moving legacy equipment updates area membership and preserves unknown legacy references', () => {
  const initial = createWorkspaceState();
  initial.areas.find((area) => area.id === 'oeste').equipmentIds.push('unknown-legacy-equipment');
  const equipment = initial.equipment.find((item) => item.id === 'bomba-01');
  const moved = apply(initial, { type: 'updateEquipment', id: equipment.id, input: { ...equipment, kind: 'Chiller', areaId: 'central' } });
  for (const state of [moved, parseWorkspaceState(JSON.stringify(moved))]) {
    const workspace = deriveWorkspace(state);
    assert.equal(workspace.areas.find((area) => area.id === 'oeste').equipmentIds.includes(equipment.id), false);
    assert.equal(workspace.areas.find((area) => area.id === 'central').equipmentIds.includes(equipment.id), true);
    assert.equal(workspace.areas.find((area) => area.id === 'oeste').equipmentIds.includes('unknown-legacy-equipment'), true);
    assert.equal(workspace.areas.filter((area) => area.equipmentIds.includes(equipment.id)).length, 1);
  }
});
