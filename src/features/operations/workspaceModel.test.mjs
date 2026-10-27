import assert from 'node:assert/strict';
import test from 'node:test';
import { applyWorkspaceAction, createWorkspaceState, deriveWorkspace, parseWorkspaceState } from './workspaceModel.ts';

const apply = (state, action) => applyWorkspaceAction(state, action, { role: 'admin' });

const addArea = { type: 'addArea', id: 'new-area', input: { name: 'Novo setor', position: [0.1, 0.9] } };
const addTeam = { type: 'addTeam', id: 'new-team', input: { name: 'Equipe nova', supervisor: 'Maria', areaId: 'new-area', position: [0.8, 0.2], members: ['João'] } };

test('setores e equipes adicionados sobrevivem à recarga com vínculo e posições independentes', () => {
  let state = apply(apply(createWorkspaceState(), addArea), addTeam);
  state = apply(state, { type: 'moveMarker', id: 'team:new-team', position: [0, 1] });
  state = apply(state, { type: 'moveMarker', id: 'area:new-area', position: [1, 0] });
  const loaded = parseWorkspaceState(JSON.stringify(state));
  assert.deepEqual(loaded, state);
  const workspace = deriveWorkspace(loaded);
  assert.equal(workspace.teams.length, 4);
  assert.equal(workspace.areas.length, 5);
  assert.equal(workspace.teams.at(-1).areaId, 'new-area');
  assert.deepEqual(workspace.areas.at(-1).position, [1, 0]);
  assert.deepEqual(workspace.areas.at(-1).teamIds, ['new-team']);
  assert.deepEqual(workspace.markers.find((marker) => marker.id === 'team:new-team').position, [0, 1]);
});

test('remoção do mapa preserva cadastros, vínculos e equipamentos; restauração aceita novo ponto', () => {
  const original = createWorkspaceState();
  const hidden = apply(apply(original, { type: 'hideMarker', id: 'area:oeste' }), { type: 'hideMarker', id: 'team:mecanica' });
  const workspace = deriveWorkspace(parseWorkspaceState(JSON.stringify(hidden)));
  assert.equal(workspace.markers.length, 4);
  assert.equal(workspace.hiddenMarkers.length, 2);
  assert.deepEqual(workspace.areas, deriveWorkspace(original).areas);
  assert.deepEqual(workspace.teams, deriveWorkspace(original).teams);
  const restored = deriveWorkspace(apply(hidden, { type: 'restoreMarker', id: 'team:mecanica', position: [0.5, 0.5] }));
  assert.deepEqual(restored.markers.find((marker) => marker.id === 'team:mecanica').position, [0.5, 0.5]);
  assert.equal(deriveWorkspace(original).hiddenMarkers.length, 0);
});

test('entrada inválida nunca altera as sementes nem aceita referências inexistentes', () => {
  const state = createWorkspaceState();
  const before = JSON.stringify(state);
  for (const position of [[-0.1, 0], [1.1, 0], [NaN, 0], [Infinity, 0], [0], ['0', 0]]) {
    assert.throws(() => apply(state, { ...addArea, input: { ...addArea.input, position } }));
    assert.throws(() => apply(state, { type: 'moveMarker', id: 'area:oeste', position }));
  }
  assert.throws(() => apply(state, addTeam), /área designada/);
  assert.throws(() => apply(state, { ...addArea, id: 'oeste' }), /cadastrado/);
  assert.throws(() => apply(state, { ...addArea, input: { ...addArea.input, name: ' ' } }), /nome/);
  assert.throws(() => apply(state, { type: 'hideMarker', id: 'area:missing' }));
  assert.equal(JSON.stringify(state), before);
});

test('persistência rejeita versão, posições, marcadores duplicados e referências corrompidas', () => {
  const state = apply(apply(createWorkspaceState(), addArea), addTeam);
  const corruptions = [
    { ...state, version: 999 },
    { ...state, markers: state.markers.slice(1) },
    { ...state, markers: state.markers.map((marker, i) => i === 0 ? state.markers[1] : marker) },
    { ...state, markers: state.markers.map((marker, i) => i === 0 ? { ...marker, position: [2, 0] } : marker) },
    { ...state, teams: [{ ...state.teams[0], areaId: 'missing' }] },
  ];
  for (const invalid of corruptions) assert.throws(() => parseWorkspaceState(JSON.stringify(invalid)));
  assert.throws(() => parseWorkspaceState('{invalid'));
  assert.deepEqual(parseWorkspaceState(JSON.stringify(state)), state);
});
