import { useSyncExternalStore } from 'react';
import { getWorkspaceSnapshot, useWorkspaceData } from './useWorkspaceData';
import { demoActors } from './data';
import type { DemoRole } from './data';
import { applyExecutionAction, createDemoState, parseOperationsState, summarizeExecutions } from './model';
import type { ExecutionAction, ExecutionKind, ExecutionReport, OperationsState } from './model';

const STORAGE_KEY = 'campo-livre:operations:v1';
interface StoreSnapshot { state: OperationsState; storageWarning: string }
let snapshot: StoreSnapshot = { state: createDemoState(), storageWarning: '' };
let initialized = false;
let protectExistingData = false;
const listeners = new Set<() => void>();

function readStoredState(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    snapshot = { state: raw ? parseOperationsState(raw) : createDemoState(), storageWarning: '' };
    protectExistingData = false;
  } catch {
    // Do not overwrite an unrecognized or damaged record with the demo seed.
    protectExistingData = true;
    snapshot = { ...snapshot, storageWarning: 'Não foi possível ler os dados locais. Esta sessão usa dados demonstrativos; os dados existentes serão preservados.' };
  }
}

function getSnapshot(): StoreSnapshot {
  if (!initialized) { initialized = true; readStoredState(); }
  return snapshot;
}

function emit(): void { for (const listener of listeners) listener(); }
function onStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  readStoredState();
  emit();
}
function subscribe(listener: () => void): () => void {
  if (!listeners.size && typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

export interface OperationResult { ok: boolean; message: string }

function dispatch(action: ExecutionAction): OperationResult {
  getSnapshot();
  try {
    const state = applyExecutionAction(snapshot.state, action, getWorkspaceSnapshot());
    let storageWarning = snapshot.storageWarning;
    if (!protectExistingData) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        storageWarning = '';
      } catch {
        storageWarning = 'A alteração está apenas nesta sessão: o navegador não conseguiu salvá-la. Reduza as fotos ou libere espaço para persistir os dados.';
      }
    }
    snapshot = { state, storageWarning };
    emit();
    return { ok: true, message: storageWarning ? 'Atualizado nesta sessão. Confira o aviso de armazenamento.' : 'Registro atualizado e salvo neste navegador.' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Não foi possível atualizar o registro.' };
  }
}

function context(role: DemoRole) { return { role, actor: demoActors[role], at: new Date().toISOString() }; }

export function useOperations() {
  const workspace = useWorkspaceData();
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    records: current.state.records,
    storageWarning: current.storageWarning,
    summary: summarizeExecutions(current.state.records, undefined, workspace),
    submitExecution(equipmentId: string, kind: ExecutionKind, report: ExecutionReport, role: DemoRole): OperationResult {
      const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return dispatch({ type: 'submit', id, equipmentId, kind, report, context: context(role) });
    },
    resubmitExecution(id: string, report: ExecutionReport, role: DemoRole): OperationResult {
      return dispatch({ type: 'resubmit', id, report, context: context(role) });
    },
    approveExecution(id: string, role: DemoRole): OperationResult {
      return dispatch({ type: 'approve', id, context: context(role) });
    },
    returnExecution(id: string, reason: string, role: DemoRole): OperationResult {
      return dispatch({ type: 'return', id, reason, context: context(role) });
    },
  };
}
