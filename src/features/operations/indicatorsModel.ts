import { getExecutionStatus, getLatestSubmission } from './model.ts';
import type { EquipmentCatalog, ExecutionKind, ExecutionRecord } from './model.ts';

export const UNKNOWN_AREA_ID = '__unknown__';

export interface IndicatorCounts {
  total: number;
  completed: number;
  preventiveCompleted: number;
  correctiveCompleted: number;
  inspectionCompleted: number;
  pendingApproval: number;
  returned: number;
}

export interface MaintenanceIndicatorFilters {
  month: string;
  areaId?: string;
  kind?: ExecutionKind;
}

export interface MaintenanceIndicators {
  summary: IndicatorCounts;
  monthlyTrend: (IndicatorCounts & { month: string })[];
  byArea: (IndicatorCounts & { areaId: string; areaName: string })[];
  records: ExecutionRecord[];
}

function emptyCounts(): IndicatorCounts {
  return { total: 0, completed: 0, preventiveCompleted: 0, correctiveCompleted: 0, inspectionCompleted: 0, pendingApproval: 0, returned: 0 };
}

function count(counts: IndicatorCounts, record: ExecutionRecord): void {
  counts.total += 1;
  const status = getExecutionStatus(record);
  if (status === 'pending') counts.pendingApproval += 1;
  else if (status === 'returned') counts.returned += 1;
  else {
    counts.completed += 1;
    if (record.kind === 'preventiva') counts.preventiveCompleted += 1;
    else if (record.kind === 'corretiva') counts.correctiveCompleted += 1;
    else counts.inspectionCompleted += 1;
  }
}

/** Current status grouped by the latest report's execution month, never approval time. */
export function buildMaintenanceIndicators(records: ExecutionRecord[], catalog: EquipmentCatalog, filters: MaintenanceIndicatorFilters): MaintenanceIndicators {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month) || filters.month < '0001-06') {
    throw new Error('Informe um mês válido no formato AAAA-MM.');
  }
  const [year, month] = filters.month.split('-').map(Number);
  const endMonth = year * 12 + month - 1;
  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const value = endMonth - 5 + index;
    return { month: `${String(Math.floor(value / 12)).padStart(4, '0')}-${String(value % 12 + 1).padStart(2, '0')}`, ...emptyCounts() };
  });
  const trendByMonth = new Map(monthlyTrend.map((entry) => [entry.month, entry]));
  const equipmentById = new Map(catalog.equipment.map((item) => [item.id, item]));
  const areasById = new Map(catalog.areas.map((area) => [area.id, area]));
  const areaCounts = new Map<string, MaintenanceIndicators['byArea'][number]>();
  const summary = emptyCounts();
  const filteredRecords: ExecutionRecord[] = [];

  for (const record of records) {
    if (filters.kind && record.kind !== filters.kind) continue;
    const item = equipmentById.get(record.equipmentId);
    const area = item ? areasById.get(item.areaId) : undefined;
    const areaId = area?.id ?? UNKNOWN_AREA_ID;
    if (filters.areaId && filters.areaId !== areaId) continue;
    const executionMonth = getLatestSubmission(record).report.executionDate.slice(0, 7);
    const trend = trendByMonth.get(executionMonth);
    if (trend) count(trend, record);
    if (executionMonth !== filters.month) continue;
    filteredRecords.push(record);
    count(summary, record);
    let group = areaCounts.get(areaId);
    if (!group) {
      group = { areaId, areaName: area?.name ?? 'Área não encontrada', ...emptyCounts() };
      areaCounts.set(areaId, group);
    }
    count(group, record);
  }

  return {
    summary,
    monthlyTrend,
    byArea: [...areaCounts.values()].sort((a, b) => b.total - a.total || a.areaName.localeCompare(b.areaName, 'pt-BR')),
    records: filteredRecords,
  };
}
