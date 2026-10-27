import { validateArrivalGuide } from './arrivalGuideModel.ts';
import type { ArrivalGuide } from './arrivalGuideModel.ts';
import { areas as seedAreas, teams as seedTeams, collaboratorsForTeam, jobTitles, roleLabels, equipment as seedEquipment, equipmentTypes } from './data.ts';
import type { Area, Team, Collaborator, DemoRole, Equipment, EquipmentType } from './data.ts';

export type MapPosition = [number, number];
export interface AccessContext { role: DemoRole; teamId?: string }
export interface MapMarker { id: string; kind: 'area' | 'team'; entityId: string; label: string; position: MapPosition }
export interface WorkspaceResult { ok: boolean; message: string; id?: string }
export interface AddAreaInput { name: string; position?: MapPosition; description?: string }
export interface AddTeamInput { name: string; supervisor: string; areaId: string; position: MapPosition; members?: string[]; image?: string }
export type CollaboratorInput = Pick<Collaborator, 'name' | 'jobTitle' | 'teamId' | 'accessRole'>;
interface StoredMarker { id: string; position: MapPosition; hidden: boolean }
export interface EquipmentInput { name: string; tag: string; kind: EquipmentType; areaId: string; location: string }
export interface WorkspaceState { version: 3; equipment: Equipment[]; areas: Area[]; teams: Team[]; collaborators: Collaborator[]; markers: StoredMarker[] }
export type WorkspaceAction =
  | { type: 'setArrivalGuide'; id: string; entity: 'area' | 'equipment'; guide: ArrivalGuide | null }
  | { type: 'addEquipment' | 'updateEquipment'; id: string; input: EquipmentInput }
  | { type: 'setEquipmentActive'; id: string; active: boolean }
  | { type: 'addArea'; id: string; input: AddAreaInput }
  | { type: 'addTeam'; id: string; input: AddTeamInput }
  | { type: 'updateArea'; id: string; input: Pick<Area, 'name' | 'description'> }
  | { type: 'setAreaActive' | 'setCollaboratorActive'; id: string; active: boolean }
  | { type: 'addCollaborator' | 'updateCollaborator'; id: string; input: CollaboratorInput }
  | { type: 'assignCollaborator'; id: string; teamId: string | null }
  | { type: 'setTeamArea'; id: string; areaId: string }
  | { type: 'moveMarker'; id: string; position: MapPosition }
  | { type: 'hideMarker'; id: string }
  | { type: 'restoreMarker'; id: string; position?: MapPosition };

function position(value: unknown): MapPosition {
  if (!Array.isArray(value) || value.length !== 2 || !value.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) throw new Error('Escolha uma posição válida dentro do mapa.');
  return [value[0], value[1]];
}
function required(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Informe ${label}.`);
  return value.trim();
}
function find<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((item) => item.id === id);
  if (!item) throw new Error('Cadastro não encontrado.');
  return item;
}
function activeArea(state: WorkspaceState, id: string) {
  if (!state.areas.some((area) => area.id === id && area.active)) throw new Error('Selecione uma área designada ativa e válida.');
}
function collaboratorInput(state: WorkspaceState, input: CollaboratorInput): CollaboratorInput {
  if (!jobTitles.includes(input.jobTitle) || !Object.hasOwn(roleLabels, input.accessRole)) throw new Error('Selecione cargo e perfil de acesso válidos.');
  if (input.teamId !== null) find(state.teams, input.teamId);
  return { name: required(input.name, 'o nome do colaborador'), jobTitle: input.jobTitle, teamId: input.teamId, accessRole: input.accessRole };
}
function validateAssignment(state: WorkspaceState, personId: string, previous: string | null, next: string | null) {
  if (previous === next) return;
  if (state.teams.some((team) => team.supervisorId === personId)) throw new Error('O responsável permanece vinculado à equipe.');
  if (next !== null) activeArea(state, find(state.teams, next).areaId);
}
export function createWorkspaceState(): WorkspaceState {
  const teams = seedTeams.map((team) => ({ ...team, members: [...team.members], supervisorId: `supervisor:${team.id}` }));
  return { version: 3, equipment: structuredClone(seedEquipment), areas: structuredClone(seedAreas), teams, collaborators: teams.flatMap(collaboratorsForTeam), markers: [
    ...seedAreas.map((area) => ({ id: `area:${area.id}`, position: position(area.position), hidden: false })),
    ...seedTeams.map((team) => {
      const area = seedAreas.find((item) => item.id === team.areaId)!;
      return { id: `team:${team.id}`, position: position([area.position[0] + 0.045, area.position[1] + 0.065]), hidden: false };
    }),
  ] };
}
export function deriveWorkspace(state: WorkspaceState) {
  const teams = state.teams.map((team) => ({ ...team, supervisor: state.collaborators.find((person) => person.id === team.supervisorId)?.name ?? team.supervisor, members: state.collaborators.filter((person) => person.active && person.teamId === team.id && person.id !== team.supervisorId).map((person) => person.name) }));
  const equipmentIds = new Set(state.equipment.map((item) => item.id));
  const areas = state.areas.map((area) => ({
    ...area,
    equipmentIds: [...new Set([
      // Preserve unknown legacy references; known equipment follows its current area.
      ...area.equipmentIds.filter((id) => !equipmentIds.has(id)),
      ...state.equipment.filter((item) => item.areaId === area.id).map((item) => item.id),
    ])],
    position: state.markers.find((marker) => marker.id === `area:${area.id}`)?.position ?? area.position,
    teamIds: teams.filter((team) => team.areaId === area.id).map((team) => team.id),
  }));
  const eligible = state.markers.filter((marker) => {
    const areaId = marker.id.startsWith('area:') ? marker.id.slice(5) : teams.find((team) => team.id === marker.id.slice(5))?.areaId;
    return areas.some((area) => area.id === areaId && area.active);
  });
  const mapMarker = (marker: StoredMarker): MapMarker => {
    const kind = marker.id.startsWith('area:') ? 'area' : 'team';
    const entityId = marker.id.slice(5);
    return { id: marker.id, kind, entityId, label: (kind === 'area' ? find(areas, entityId) : find(teams, entityId)).name, position: marker.position };
  };
  return { areas, teams, equipment: state.equipment, collaborators: state.collaborators, markers: eligible.filter((marker) => !marker.hidden).map(mapMarker), hiddenMarkers: eligible.filter((marker) => marker.hidden).map(mapMarker) };
}
export function applyWorkspaceAction(state: WorkspaceState, action: WorkspaceAction, access: AccessContext = { role: 'technician' }): WorkspaceState {
  const ownTeam = (id: string | null) => access.role === 'supervisor' && !!access.teamId && id === access.teamId;
  if (access.role !== 'admin') {
    let allowed = false;
    if (action.type === 'setArrivalGuide') {
      const areaId = action.entity === 'area' ? action.id : find(state.equipment, action.id).areaId;
      allowed = access.role === 'supervisor' && !!access.teamId && state.teams.some(team => team.id === access.teamId && team.areaId === areaId);
    } else if (action.type === 'assignCollaborator') {
      const person = find(state.collaborators, action.id);
      allowed = access.role === 'supervisor' && !!access.teamId && (person.teamId === null || ownTeam(person.teamId)) && (action.teamId === null || ownTeam(action.teamId));
    } else if (action.type === 'setTeamArea') allowed = ownTeam(action.id);
    else if (['moveMarker', 'hideMarker', 'restoreMarker'].includes(action.type)) allowed = action.id.startsWith('team:') && ownTeam(action.id.slice(5));
    if (!allowed) throw new Error('Seu perfil não tem permissão para esta alteração.');
  }
  if (action.type === 'addArea' || action.type === 'addTeam' || action.type === 'addCollaborator' || action.type === 'addEquipment') {
    required(action.id, 'um identificador');
    if ([...state.areas, ...state.teams, ...state.collaborators, ...state.equipment].some((item) => item.id === action.id)) throw new Error('Este identificador já está cadastrado.');
  }
  switch (action.type) {
    case 'setArrivalGuide': {
      if (action.entity !== 'area' && action.entity !== 'equipment') throw new Error('Local inválido.');
      const collection = action.entity === 'area' ? 'areas' : 'equipment';
      const item = action.entity === 'area' ? find(state.areas, action.id) : find(state.equipment, action.id);
      const area = action.entity === 'area' ? find(state.areas, item.id) : find(state.areas, find(state.equipment, item.id).areaId);
      if (!area.active || !item.active) throw new Error('Reative o local antes de alterar suas orientações.');
      const arrivalGuide = action.guide === null ? undefined : validateArrivalGuide(action.guide);
      if (collection === 'areas') return { ...state, areas: state.areas.map(item => item.id === action.id ? updateGuide(item, arrivalGuide) : item) };
      return { ...state, equipment: state.equipment.map(item => item.id === action.id ? updateGuide(item, arrivalGuide) : item) };
    }
    case 'addEquipment':
    case 'updateEquipment': {
      const existing = action.type === 'updateEquipment' ? find(state.equipment, action.id) : undefined;
      const { input } = action;
      const name = required(input.name, 'o nome do equipamento');
      const tag = required(input.tag, 'a identificação do equipamento');
      if (!equipmentTypes.includes(input.kind)) throw new Error('Selecione um tipo de equipamento válido.');
      if (!existing || existing.areaId !== input.areaId) activeArea(state, input.areaId);
      if (state.equipment.some((item) => item.id !== action.id && item.tag.toLocaleLowerCase() === tag.toLocaleLowerCase())) throw new Error('Esta identificação já está cadastrada.');
      const item: Equipment = { ...existing, id: action.id, name, tag, kind: input.kind, areaId: input.areaId, location: requiredDescription(input.location), active: existing?.active ?? true };
      if (existing && existing.areaId !== input.areaId) delete item.arrivalGuide;
      return { ...state, equipment: existing ? state.equipment.map((equipment) => equipment.id === action.id ? item : equipment) : [...state.equipment, item] };
    }
    case 'setEquipmentActive':
      find(state.equipment, action.id);
      if (typeof action.active !== 'boolean') throw new Error('Situação inválida.');
      return { ...state, equipment: state.equipment.map((item) => item.id === action.id ? { ...item, active: action.active } : item) };

    case 'addArea': {
      const point = position(action.input.position ?? [0.5, 0.5]);
      const area: Area = { id: action.id, name: required(action.input.name, 'o nome da área'), description: action.input.description?.trim() ?? '', active: true, position: point, teamIds: [], equipmentIds: [] };
      return { ...state, areas: [...state.areas, area], markers: [...state.markers, { id: `area:${area.id}`, position: point, hidden: action.input.position === undefined }] };
    }
    case 'addTeam': {
      const { input, id } = action;
      activeArea(state, input.areaId);
      const illustration = seedTeams.find((team) => team.image === (input.image ?? seedTeams[0].image));
      if (!illustration) throw new Error('Selecione uma imagem de equipe válida.');
      if (input.members !== undefined && (!Array.isArray(input.members) || !input.members.every((member) => typeof member === 'string'))) throw new Error('Informe os integrantes da equipe.');
      const team: Team = { id, name: required(input.name, 'o nome da equipe'), supervisor: required(input.supervisor, 'o supervisor'), supervisorId: `supervisor:${id}`, areaId: input.areaId, members: (input.members ?? []).map((name) => name.trim()).filter(Boolean), image: illustration.image, imageAlt: illustration.imageAlt };
      const people = collaboratorsForTeam(team);
      if (people.some((person) => [...state.areas, ...state.teams, ...state.collaborators, ...state.equipment].some((entity) => entity.id === person.id))) throw new Error('Identificador de integrante já cadastrado.');
      return { ...state, teams: [...state.teams, team], collaborators: [...state.collaborators, ...people], markers: [...state.markers, { id: `team:${id}`, position: position(input.position), hidden: false }] };
    }
    case 'updateArea':
      find(state.areas, action.id);
      return { ...state, areas: state.areas.map((area) => area.id === action.id ? { ...area, name: required(action.input.name, 'o nome da área'), description: requiredDescription(action.input.description) } : area) };
    case 'setAreaActive':
      find(state.areas, action.id);
      if (typeof action.active !== 'boolean') throw new Error('Situação inválida.');
      return { ...state, areas: state.areas.map((area) => area.id === action.id ? { ...area, active: action.active } : area) };
    case 'addCollaborator':
      validateAssignment(state, action.id, null, action.input.teamId);
      return { ...state, collaborators: [...state.collaborators, { ...collaboratorInput(state, action.input), id: action.id, active: true }] };
    case 'updateCollaborator': {
      const existing = find(state.collaborators, action.id);
      if (!existing.active && action.input.teamId !== existing.teamId) throw new Error('Reative o colaborador antes de alterar sua equipe.');
      validateAssignment(state, existing.id, existing.teamId, action.input.teamId);
      const input = collaboratorInput(state, action.input);
      return { ...state, collaborators: state.collaborators.map((person) => person.id === action.id ? { ...person, ...input } : person) };
    }
    case 'setCollaboratorActive':
      find(state.collaborators, action.id);
      if (typeof action.active !== 'boolean') throw new Error('Situação inválida.');
      return { ...state, collaborators: state.collaborators.map((person) => person.id === action.id ? { ...person, active: action.active } : person) };
    case 'assignCollaborator': {
      const person = find(state.collaborators, action.id);
      if (!person.active) throw new Error('Reative o colaborador antes de alterar sua equipe.');
      validateAssignment(state, person.id, person.teamId, action.teamId);
      return { ...state, collaborators: state.collaborators.map((person) => person.id === action.id ? { ...person, teamId: action.teamId } : person) };
    }
    case 'setTeamArea':
      find(state.teams, action.id);
      activeArea(state, action.areaId);
      return { ...state, teams: state.teams.map((team) => team.id === action.id ? { ...team, areaId: action.areaId } : team) };
    default: {
      find(state.markers, action.id);
      const point = action.type !== 'hideMarker' && action.position !== undefined ? position(action.position) : undefined;
      return { ...state, markers: state.markers.map((marker) => marker.id !== action.id ? marker : { ...marker, position: point ?? marker.position, hidden: action.type === 'hideMarker' ? true : action.type === 'restoreMarker' ? false : marker.hidden }) };
    }
  }
}
function updateGuide<T extends { arrivalGuide?: ArrivalGuide }>(item: T, guide?: ArrivalGuide): T {
  const updated = { ...item };
  if (guide) updated.arrivalGuide = guide;
  else delete updated.arrivalGuide;
  return updated;
}
function requiredDescription(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Informe uma descrição válida.');
  return value.trim();
}

export function parseWorkspaceState(raw: string): WorkspaceState {
  const data = JSON.parse(raw);
  let state: WorkspaceState;
  if (data?.version === 1 && Array.isArray(data.addedAreas) && Array.isArray(data.addedTeams)) {
    const seed = createWorkspaceState();
    const teams: Team[] = [...seed.teams, ...data.addedTeams.map((team: Team) => ({ ...team, supervisorId: `supervisor:${team.id}` }))];
    state = { ...data, version: 3, equipment: structuredClone(seedEquipment), areas: [...seed.areas, ...data.addedAreas.map((area: Area) => ({ ...area, active: true }))], teams, collaborators: teams.flatMap(collaboratorsForTeam), markers: data.markers };
  } else if (data?.version === 2) state = { ...data, version: 3, equipment: data.equipment ?? structuredClone(seedEquipment) };
  else if (data?.version === 3) state = data;
  else throw new Error('Dados locais inválidos ou de outra versão.');
  if (![state.areas, state.teams, state.collaborators, state.equipment, state.markers].every(Array.isArray)) throw new Error('Cadastros locais incompletos.');
  const ids = new Set<string>();
  for (const entity of [...state.areas, ...state.teams, ...state.collaborators, ...state.equipment]) {
    required(entity.id, 'um identificador'); required(entity.name, 'um nome');
    if (ids.has(entity.id)) throw new Error('Cadastro local duplicado.');
    ids.add(entity.id);
  }
  for (const area of state.areas) {
    position(area.position);
    if (area.arrivalGuide !== undefined) area.arrivalGuide = validateArrivalGuide(area.arrivalGuide);
    if (typeof area.active !== 'boolean' || typeof area.description !== 'string' || !Array.isArray(area.equipmentIds) || !Array.isArray(area.teamIds) || ![...area.equipmentIds, ...area.teamIds].every((id) => typeof id === 'string')) throw new Error('Área local inválida.');
  }
  for (const team of state.teams) {
    find(state.areas, team.areaId); required(team.supervisor, 'o supervisor');
    if (!Array.isArray(team.members) || !team.members.every((name) => typeof name === 'string') || typeof team.image !== 'string' || typeof team.imageAlt !== 'string') throw new Error('Equipe local inválida.');
    if (team.supervisorId) find(state.collaborators, team.supervisorId);
  }
  for (const person of state.collaborators) {
    collaboratorInput(state, person);
    if (typeof person.active !== 'boolean') throw new Error('Colaborador local inválido.');
  }
  const tags = new Set<string>();
  for (const item of state.equipment) {
    find(state.areas, item.areaId);
    if (item.arrivalGuide !== undefined) item.arrivalGuide = validateArrivalGuide(item.arrivalGuide);
    const tag = required(item.tag, 'a identificação do equipamento').toLocaleLowerCase();
    if (tags.has(tag) || typeof item.active !== 'boolean' || typeof item.kind !== 'string' || typeof item.location !== 'string') throw new Error('Equipamento local inválido.');
    tags.add(tag);
  }
  const expected = new Set([...state.areas.map((area) => `area:${area.id}`), ...state.teams.map((team) => `team:${team.id}`)]);
  if (state.markers.length !== expected.size) throw new Error('Marcadores locais incompletos.');
  for (const marker of state.markers) {
    if (!expected.delete(marker.id) || typeof marker.hidden !== 'boolean') throw new Error('Marcadores locais inválidos.');
    position(marker.position);
  }
  return state;
}
