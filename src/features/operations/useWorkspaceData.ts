import { useSyncExternalStore } from 'react';
import { applyWorkspaceAction, createWorkspaceState, deriveWorkspace, parseWorkspaceState } from './workspaceModel';
import type { AccessContext, EquipmentInput, CollaboratorInput, AddAreaInput, AddTeamInput, MapPosition, WorkspaceAction, WorkspaceResult } from './workspaceModel';
export type { MapMarker, MapPosition, WorkspaceResult } from './workspaceModel';

const STORAGE_KEY = 'campo-livre:workspace:v1';
let state = createWorkspaceState();
let snapshot = { ...deriveWorkspace(state), storageWarning: '' };
let initialized = false;
let protectExistingData = false;
const listeners = new Set<() => void>();
function readStorage() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    state = raw ? parseWorkspaceState(raw) : createWorkspaceState();
    protectExistingData = false;
    snapshot = { ...deriveWorkspace(state), storageWarning: '' };
  } catch {
    protectExistingData = true;
    snapshot = { ...snapshot, storageWarning: 'Não foi possível ler o mapa salvo. Os dados existentes serão preservados; alterações ficam apenas nesta sessão.' };
  }
}
export function getWorkspaceSnapshot() {
  if (!initialized) { initialized = true; readStorage(); }
  return snapshot;
}
function emit() { for (const listener of listeners) listener(); }
function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  readStorage();
  emit();
}
function subscribe(listener: () => void) {
  if (!listeners.size && typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}
function dispatch(action: WorkspaceAction, access: AccessContext): WorkspaceResult {
  getWorkspaceSnapshot();
  try {
    const next = applyWorkspaceAction(state, action, access);
    let storageWarning = snapshot.storageWarning;
    if (!protectExistingData) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        storageWarning = '';
      } catch {
        storageWarning = 'A alteração do mapa está apenas nesta sessão: o navegador não conseguiu salvá-la.';
      }
    }
    state = next;
    snapshot = { ...deriveWorkspace(state), storageWarning };
    emit();
    return { ok: true, id: action.id, message: storageWarning ? 'Mapa atualizado nesta sessão. Confira o aviso de armazenamento.' : 'Mapa atualizado e salvo neste navegador.' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Não foi possível atualizar o mapa.' };
  }
}
function newId() { return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function useWorkspaceData(access: AccessContext = { role: 'technician' }) {
  const snapshot = useSyncExternalStore(subscribe, getWorkspaceSnapshot, getWorkspaceSnapshot);
  const send = (action: WorkspaceAction) => dispatch(action, access);
  return { ...snapshot,
    addEquipment: (input: EquipmentInput) => send({ type: 'addEquipment', id: newId(), input }),
    updateEquipment: (id: string, input: EquipmentInput) => send({ type: 'updateEquipment', id, input }),
    setEquipmentActive: (id: string, active: boolean) => send({ type: 'setEquipmentActive', id, active }),
    addArea: (input: AddAreaInput) => send({ type: 'addArea', id: newId(), input }),
    addTeam: (input: AddTeamInput) => send({ type: 'addTeam', id: newId(), input }),
    updateArea: (id: string, input: { name: string; description: string }) => send({ type: 'updateArea', id, input }),
    setAreaActive: (id: string, active: boolean) => send({ type: 'setAreaActive', id, active }),
    addCollaborator: (input: CollaboratorInput) => send({ type: 'addCollaborator', id: newId(), input }),
    updateCollaborator: (id: string, input: CollaboratorInput) => send({ type: 'updateCollaborator', id, input }),
    setCollaboratorActive: (id: string, active: boolean) => send({ type: 'setCollaboratorActive', id, active }),
    assignCollaborator: (id: string, teamId: string | null) => send({ type: 'assignCollaborator', id, teamId }),
    setTeamArea: (id: string, areaId: string) => send({ type: 'setTeamArea', id, areaId }),
    moveMarker: (id: string, position: MapPosition) => send({ type: 'moveMarker', id, position }),
    hideMarker: (id: string) => send({ type: 'hideMarker', id }),
    restoreMarker: (id: string, position?: MapPosition) => send({ type: 'restoreMarker', id, position }),
  };
}
