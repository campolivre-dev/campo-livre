import { equipment, areas } from './data.ts';
import type { DemoRole, Equipment, Area } from './data.ts';

export type ExecutionKind = 'preventiva' | 'corretiva' | 'inspecao';
export type ExecutionStatus = 'pending' | 'returned' | 'completed';

export interface ExecutionPhoto { name: string; dataUrl: string }
export interface ExecutionReport {
  executionDate: string;
  description: string;
  changes: string;
  pending: string;
  photos: ExecutionPhoto[];
}
export type ExecutionEvent =
  | { type: 'submitted'; at: string; actor: string; report: ExecutionReport }
  | { type: 'returned'; at: string; actor: string; reason: string }
  | { type: 'approved'; at: string; actor: string };

export interface ExecutionRecord {
  id: string;
  equipmentId: string;
  kind: ExecutionKind;
  events: ExecutionEvent[];
}

export interface OperationsState { version: 1; records: ExecutionRecord[] }
export interface ExecutionContext { role: DemoRole; actor: string; at: string }
export type ExecutionAction =
  | { type: 'submit'; id: string; equipmentId: string; kind: ExecutionKind; report: ExecutionReport; context: ExecutionContext }
  | { type: 'resubmit'; id: string; report: ExecutionReport; context: ExecutionContext }
  | { type: 'approve'; id: string; context: ExecutionContext }
  | { type: 'return'; id: string; reason: string; context: ExecutionContext };

export const statusLabels: Record<ExecutionStatus, string> = {
  pending: 'Aguardando aprovação', returned: 'Devolvida para correção', completed: 'Concluída',
};
export const kindLabels: Record<ExecutionKind, string> = {
  preventiva: 'Preventiva', corretiva: 'Corretiva', inspecao: 'Inspeção',
};

export function getExecutionStatus(record: ExecutionRecord): ExecutionStatus {
  const last = record.events.at(-1);
  return last?.type === 'approved' ? 'completed' : last?.type === 'returned' ? 'returned' : 'pending';
}

export function getLatestSubmission(record: ExecutionRecord): Extract<ExecutionEvent, { type: 'submitted' }> {
  const submission = [...record.events].reverse().find((event) => event.type === 'submitted');
  if (!submission || submission.type !== 'submitted') throw new Error('Registro sem relato de execução.');
  return submission;
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function cleanReport(report: ExecutionReport, context: ExecutionContext): ExecutionReport {
  if (!report.description.trim()) throw new Error('Descreva o trabalho realizado antes de enviar.');
  if (!isCalendarDate(report.executionDate) || report.executionDate > localDate(new Date(context.at))) {
    throw new Error('Informe uma data de execução válida, até hoje.');
  }
  if (report.description.length > 5000 || report.changes.length > 3000 || report.pending.length > 3000) throw new Error('O relato ultrapassou o limite de caracteres.');
  if (report.photos.length > 2 || report.photos.some((photo) => !isPhoto(photo))) throw new Error('Use até duas fotos JPG, PNG ou WebP de até 500 KB cada.');
  return { ...report, description: report.description.trim(), changes: report.changes.trim(), pending: report.pending.trim(), photos: report.photos.map((photo) => ({ ...photo })) };
}

export interface EquipmentCatalog { equipment: Equipment[]; areas: Area[] }

export function applyExecutionAction(state: OperationsState, action: ExecutionAction, catalog: EquipmentCatalog = { equipment, areas }): OperationsState {
  const { context } = action;
  if (!context.actor.trim() || !Number.isFinite(new Date(context.at).getTime())) throw new Error('Identificação do registro inválida.');
  if (action.type === 'submit') {
    if (context.role !== 'technician') throw new Error('Use o perfil de técnico para registrar uma execução.');
    const item = catalog.equipment.find((item) => item.id === action.equipmentId);
    if (!item) throw new Error('Equipamento não encontrado.');
    if (!item.active || !catalog.areas.some((area) => area.id === item.areaId && area.active)) throw new Error('Selecione um equipamento ativo em uma área ativa.');
    if (!Object.hasOwn(kindLabels, action.kind)) throw new Error('Tipo de manutenção inválido.');
    if (!action.id || state.records.some((record) => record.id === action.id)) throw new Error('Identificador de registro duplicado.');
    const event: ExecutionEvent = { type: 'submitted', at: context.at, actor: context.actor, report: cleanReport(action.report, context) };
    return { version: 1, records: [{ id: action.id, equipmentId: action.equipmentId, kind: action.kind, events: [event] }, ...state.records] };
  }
  const target = state.records.find((record) => record.id === action.id);
  if (!target) throw new Error('Registro não encontrado.');
  const status = getExecutionStatus(target);
  let event: ExecutionEvent;
  if (action.type === 'resubmit') {
    if (context.role !== 'technician' || status !== 'returned') throw new Error('Somente registros devolvidos podem ser reenviados pelo técnico.');
    event = { type: 'submitted', at: context.at, actor: context.actor, report: cleanReport(action.report, context) };
  } else {
    if (context.role !== 'supervisor') throw new Error('A aprovação e a devolução são feitas pelo supervisor.');
    if (status !== 'pending') throw new Error('Este registro não está aguardando aprovação.');
    if (action.type === 'return') {
      if (!action.reason.trim()) throw new Error('Informe o motivo da devolução.');
      if (action.reason.length > 3000) throw new Error('O motivo deve ter até 3.000 caracteres.');
      event = { type: 'returned', at: context.at, actor: context.actor, reason: action.reason.trim() };
    } else event = { type: 'approved', at: context.at, actor: context.actor };
  }
  return { version: 1, records: state.records.map((record) => record.id === action.id ? { ...record, events: [...record.events, event] } : record) };
}

export function summarizeExecutions(records: ExecutionRecord[], month = localDate().slice(0, 7), catalog: EquipmentCatalog = { equipment, areas }) {
  return {
    equipmentCount: catalog.equipment.filter((item) => item.active && catalog.areas.some((area) => area.id === item.areaId && area.active)).length,
    pendingApproval: records.filter((record) => getExecutionStatus(record) === 'pending').length,
    returned: records.filter((record) => getExecutionStatus(record) === 'returned').length,
    completed: records.filter((record) => getExecutionStatus(record) === 'completed').length,
    preventivesThisMonth: records.filter((record) => record.kind === 'preventiva' && getExecutionStatus(record) === 'completed' && getLatestSubmission(record).report.executionDate.startsWith(`${month}-`)).length,
  };
}

function isObject(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function isPhoto(value: unknown): value is ExecutionPhoto {
  return isObject(value) && typeof value.name === 'string' && typeof value.dataUrl === 'string' && value.dataUrl.length <= 690000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value.dataUrl);
}
function isReport(value: unknown): value is ExecutionReport {
  return isObject(value) && typeof value.executionDate === 'string' && isCalendarDate(value.executionDate)
    && typeof value.description === 'string' && value.description.trim().length > 0 && value.description.length <= 5000
    && typeof value.changes === 'string' && value.changes.length <= 3000 && typeof value.pending === 'string' && value.pending.length <= 3000
    && Array.isArray(value.photos) && value.photos.length <= 2 && value.photos.every(isPhoto);
}
function isEvent(value: unknown): value is ExecutionEvent {
  if (!isObject(value) || typeof value.at !== 'string' || !Number.isFinite(new Date(value.at).getTime()) || typeof value.actor !== 'string' || !value.actor.trim()) return false;
  return value.type === 'submitted' ? isReport(value.report) : value.type === 'approved' || (value.type === 'returned' && typeof value.reason === 'string' && value.reason.trim().length > 0 && value.reason.length <= 3000);
}
function isRecord(value: unknown): value is ExecutionRecord {
  if (!isObject(value) || typeof value.id !== 'string' || !value.id || typeof value.equipmentId !== 'string' || !value.equipmentId.trim()
    || typeof value.kind !== 'string' || !Object.hasOwn(kindLabels, value.kind) || !Array.isArray(value.events) || !value.events.length || !value.events.every(isEvent)) return false;
  let previous: ExecutionEvent['type'] | undefined;
  for (const event of value.events) {
    if (!previous && event.type !== 'submitted') return false;
    if (previous === 'approved' || (previous === 'returned' && event.type !== 'submitted') || (previous === 'submitted' && event.type === 'submitted')) return false;
    previous = event.type;
  }
  return true;
}

export function parseOperationsState(raw: string): OperationsState {
  const value: unknown = JSON.parse(raw);
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.records) || !value.records.every(isRecord) || new Set(value.records.map((record) => record.id)).size !== value.records.length) {
    throw new Error('Os dados locais não são compatíveis com esta versão.');
  }
  return { version: 1, records: value.records };
}

export function createDemoState(): OperationsState {
  const submit = (at: string, actor: string, description: string, changes = '', pending = ''): ExecutionEvent => ({ type: 'submitted', at, actor, report: { executionDate: at.slice(0, 10), description, changes, pending, photos: [] } });
  return { version: 1, records: [
    { id: 'demo-01', equipmentId: 'split-hi-wall-01', kind: 'preventiva', events: [submit('2026-09-28T13:30:00-03:00', 'Ana Martins', 'Realizada limpeza dos filtros e inspeção da unidade evaporadora.', 'Filtro demonstrativo higienizado.', 'Reavaliar drenagem na próxima inspeção.')] },
    { id: 'demo-02', equipmentId: 'split-hi-wall-01', kind: 'preventiva', events: [submit('2026-09-14T10:15:00-03:00', 'Lucas Ferreira', 'Inspeção preventiva e verificação da drenagem do Split Hi-Wall.', 'Dreno limpo conforme registro demonstrativo.'), { type: 'approved', actor: 'Supervisor de demonstração', at: '2026-09-15T09:00:00-03:00' }] },
    { id: 'demo-03', equipmentId: 'chiller-01', kind: 'corretiva', events: [submit('2026-09-27T15:00:00-03:00', 'Bruno Santos', 'Verificado ruído relatado e realizado ajuste no conjunto de fixação.'), { type: 'returned', actor: 'Supervisor de demonstração', at: '2026-09-28T08:00:00-03:00', reason: 'Complemente o relato com o resultado da verificação após o ajuste e as pendências identificadas.' }] },
    { id: 'demo-04', equipmentId: 'fan-coil-01', kind: 'preventiva', events: [submit('2026-09-26T11:00:00-03:00', 'Marina Alves', 'Inspeção visual da serpentina e limpeza dos filtros do Fan Coil.', '', 'Acompanhar condição da serpentina no próximo ciclo.')] },
    { id: 'demo-05', equipmentId: 'dutado-01', kind: 'preventiva', events: [submit('2026-09-22T09:30:00-03:00', 'João Silva', 'Limpeza externa e inspeção das fixações do conjunto.'), { type: 'approved', actor: 'Supervisor de demonstração', at: '2026-09-23T08:00:00-03:00' }] },
  ] };
}
