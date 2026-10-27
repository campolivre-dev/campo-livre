import { useState } from 'react';
import { Icon } from '../../components/Icon';
import type { DemoRole } from './data';
import { buildMaintenanceIndicators, UNKNOWN_AREA_ID } from './indicatorsModel';
import { getExecutionStatus, getLatestSubmission, kindLabels, localDate, statusLabels } from './model';
import type { ExecutionKind } from './model';
import { useOperations } from './useOperations';
import { useWorkspaceData } from './useWorkspaceData';
import './indicators.css';

const number = new Intl.NumberFormat('pt-BR');
const percent = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const monthName = (month: string, short = false) => new Intl.DateTimeFormat('pt-BR', {
  month: short ? 'short' : 'long', year: short ? '2-digit' : 'numeric',
}).format(new Date(`${month}-01T12:00:00`));
const dateLabel = (date: string) => date.split('-').reverse().join('/');
const kinds = ['preventiva', 'corretiva', 'inspecao'] as const;

export function IndicatorsPage({ role }: { role: DemoRole }) {
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [areaId, setAreaId] = useState('');
  const [kind, setKind] = useState<ExecutionKind | ''>('');
  const { records, storageWarning } = useOperations();
  const { areas, equipment, storageWarning: catalogWarning } = useWorkspaceData();

  if (role === 'technician') return <section className="ind-access">
    <Icon name="chart" /><h1>Indicadores da manutenção<span>.</span></h1>
    <p>O painel gerencial está disponível para administradores, supervisores e líderes.</p>
    <p>Para consultar o histórico ou registrar seu trabalho, abra um equipamento.</p>
    <a href="#/equipamentos">Ver equipamentos <Icon name="arrow" /></a>
  </section>;

  const result = buildMaintenanceIndicators(records, { areas, equipment }, { month, areaId: areaId || undefined, kind: kind || undefined });
  const { summary, monthlyTrend, byArea } = result;
  const hasUnknownArea = records.some(record => {
    const asset = equipment.find(item => item.id === record.equipmentId);
    return !asset || !areas.some(area => area.id === asset.areaId);
  });
  const largestMonth = Math.max(1, ...monthlyTrend.map(item => item.completed));
  const largestArea = Math.max(1, ...byArea.map(item => item.total));
  const completedAngle = summary.total ? summary.completed / summary.total * 360 : 0;
  const pendingAngle = summary.total ? (summary.completed + summary.pendingApproval) / summary.total * 360 : 0;
  const sortedRecords = [...result.records].sort((a, b) => getLatestSubmission(b).report.executionDate.localeCompare(getLatestSubmission(a).report.executionDate));
  const statuses = [
    { key: 'completed', label: 'Aprovadas', count: summary.completed },
    { key: 'pending', label: 'Aguardando aprovação', count: summary.pendingApproval },
    { key: 'returned', label: 'Devolvidas para correção', count: summary.returned },
  ];

  return <section className="ind-page" aria-label="Indicadores de manutenção">
    <header className="ind-heading">
      <div><p className="workspace-eyebrow">CAMPOLIVRE / INDICADORES</p><h1>Cada manutenção,<br />em números<span>.</span></h1><p>Do relato em campo à visão da operação.</p></div>
      <div className="ind-source"><span /><div><strong>Conectado ao histórico</strong><small>Visão geral da demonstração</small></div></div>
    </header>

    <form className="ind-filters" onSubmit={event => event.preventDefault()} aria-label="Filtros dos indicadores">
      <label><span>Mês de execução</span><input type="month" min="0001-06" max="9999-12" value={month} onChange={event => {
        if (/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value) && event.target.value >= '0001-06') setMonth(event.target.value);
      }} /></label>
      <label><span>Área</span><select value={areaId} onChange={event => setAreaId(event.target.value)}><option value="">Todas as áreas</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}{area.active ? '' : ' · Inativa'}</option>)}{hasUnknownArea && <option value={UNKNOWN_AREA_ID}>Área não encontrada</option>}</select></label>
      <label><span>Tipo de manutenção</span><select value={kind} onChange={event => {
        const value = event.target.value;
        if (value === '' || value === 'preventiva' || value === 'corretiva' || value === 'inspecao') setKind(value);
      }}><option value="">Todos os tipos</option>{kinds.map(value => <option key={value} value={value}>{kindLabels[value]}</option>)}</select></label>
      <button type="button" onClick={() => { setMonth(localDate().slice(0, 7)); setAreaId(''); setKind(''); }}>Limpar filtros</button>
    </form>
    <div className="ind-period"><h2>{monthName(month)}</h2><p role="status">{number.format(summary.total)} {summary.total === 1 ? 'registro no período' : 'registros no período'}</p></div>

    <div className="ind-metrics">
      <article className="ind-metric ind-metric-featured"><div><span>Preventivas aprovadas</span><Icon name="check" /></div><strong>{number.format(summary.preventiveCompleted)}</strong><p>Concluídas no mês de execução</p></article>
      <article className="ind-metric"><div><span>Total de aprovações</span><Icon name="chart" /></div><strong>{number.format(summary.completed)}</strong><p>{number.format(summary.correctiveCompleted)} corretivas · {number.format(summary.inspectionCompleted)} inspeções</p></article>
      <article className="ind-metric"><div><span>Aguardando aprovação</span><Icon name="clock" /></div><strong>{number.format(summary.pendingApproval)}</strong><p>Relatos para revisão do supervisor</p></article>
      <article className="ind-metric"><div><span>Devolvidas para correção</span><Icon name="history" /></div><strong>{number.format(summary.returned)}</strong><p>Aguardando complemento e reenvio</p></article>
    </div>

    <div className="ind-charts">
      <section className="ind-panel ind-trend" aria-labelledby="ind-trend-title">
        <div className="ind-panel-heading"><div><p className="ind-eyebrow">EVOLUÇÃO DA OPERAÇÃO</p><h2 id="ind-trend-title">Manutenções aprovadas</h2></div><span className="ind-tag">Últimos 6 meses</span></div>
        <p className="ind-panel-copy">Pela data de execução, até {monthName(month)}.</p>
        <div className="ind-legend">{kinds.map(value => <span key={value}><i className={`ind-kind-${value}`} />{kindLabels[value]}</span>)}</div>
        <figure className="ind-chart-figure">
          <div className="ind-bar-chart" role="img" aria-label={`Manutenções aprovadas por mês: ${monthlyTrend.map(item => `${monthName(item.month)}: ${item.completed}`).join('; ')}.`}>
            {monthlyTrend.map(item => <div className={`ind-bar-column ${item.month === month ? 'ind-bar-selected' : ''}`} key={item.month}>
              <div className="ind-bar-track"><div className="ind-bar-stack" style={{ height: `${item.completed / largestMonth * 100}%` }}>
                <span className="ind-bar-value">{item.completed}</span>
                <div className="ind-kind-inspecao" style={{ flex: item.inspectionCompleted }} />
                <div className="ind-kind-corretiva" style={{ flex: item.correctiveCompleted }} />
                <div className="ind-kind-preventiva" style={{ flex: item.preventiveCompleted }} />
              </div></div><span className="ind-bar-month">{monthName(item.month, true)}</span>
            </div>)}
          </div>
          <figcaption>Aprovações posteriores atualizam o mês da execução. Reenvios não duplicam a contagem.</figcaption>
        </figure>
        <details className="ind-chart-data"><summary>Ver números do gráfico</summary><div className="ind-table-scroll"><table><caption>Manutenções aprovadas nos últimos seis meses</caption><thead><tr><th>Mês</th><th>Preventivas</th><th>Corretivas</th><th>Inspeções</th></tr></thead><tbody>{monthlyTrend.map(item => <tr key={item.month}><th scope="row">{monthName(item.month)}</th><td>{item.preventiveCompleted}</td><td>{item.correctiveCompleted}</td><td>{item.inspectionCompleted}</td></tr>)}</tbody></table></div></details>
      </section>

      <section className="ind-panel ind-status-panel" aria-labelledby="ind-status-title">
        <div className="ind-panel-heading"><div><p className="ind-eyebrow">SITUAÇÃO DOS RELATOS</p><h2 id="ind-status-title">Cada etapa, visível</h2></div></div>
        <p className="ind-panel-copy">Situação atual das execuções do mês selecionado.</p>
        <div className="ind-donut" aria-hidden="true" style={{ background: summary.total ? `conic-gradient(var(--ind-completed) 0deg ${completedAngle}deg, var(--ind-pending) ${completedAngle}deg ${pendingAngle}deg, var(--ind-returned) ${pendingAngle}deg 360deg)` : 'var(--line)' }}><div><strong>{summary.total}</strong><span>registros</span></div></div>
        <ul className="ind-status-list">{statuses.map(status => <li key={status.key}><span><i className={`ind-status-${status.key}`} />{status.label}</span><strong>{status.count}<small>{percent.format(summary.total ? status.count / summary.total * 100 : 0)}%</small></strong></li>)}</ul>
        {!summary.total && <p className="ind-panel-copy">Nenhum registro para os filtros selecionados.</p>}
      </section>
    </div>

    <section className="ind-panel ind-areas" aria-labelledby="ind-areas-title">
      <div className="ind-panel-heading"><div><p className="ind-eyebrow">DISTRIBUIÇÃO NO CAMPO</p><h2 id="ind-areas-title">Registros por área</h2></div><span className="ind-tag">No mês selecionado</span></div>
      <p className="ind-panel-copy">Conforme a área atual de cada equipamento no cadastro.</p>
      <div className="ind-legend">{statuses.map(status => <span key={status.key}><i className={`ind-status-${status.key}`} />{status.label}</span>)}</div>
      {byArea.length ? <ul className="ind-area-list">{byArea.map(area => <li key={area.areaId}>
        <div className="ind-area-name">{area.areaId === UNKNOWN_AREA_ID ? <span>{area.areaName}</span> : <a href={`#/areas/${area.areaId}`}>{area.areaName}<Icon name="arrow" /></a>}<small>{area.completed} aprovadas · {area.pendingApproval} aguardando · {area.returned} devolvidas</small></div>
        <div className="ind-area-track" aria-hidden="true"><div style={{ width: `${area.total / largestArea * 100}%` }}><span className="ind-status-completed" style={{ flex: area.completed }} /><span className="ind-status-pending" style={{ flex: area.pendingApproval }} /><span className="ind-status-returned" style={{ flex: area.returned }} /></div></div><strong aria-label={`${area.total} registros`}>{area.total}</strong>
      </li>)}</ul> : <p className="ind-empty">Nenhuma área com registros neste período. Experimente outro mês ou limpe os filtros.</p>}
    </section>

    <section className="ind-panel ind-records" aria-labelledby="ind-records-title">
      <div className="ind-panel-heading"><div><p className="ind-eyebrow">DOS NÚMEROS AO HISTÓRICO</p><h2 id="ind-records-title">Execuções do período</h2></div><span className="ind-tag">{summary.total} registros</span></div>
      {sortedRecords.length ? <div className="ind-table-scroll"><table><caption>Execuções que compõem os indicadores do mês selecionado</caption><thead><tr><th>Equipamento / área</th><th>Tipo</th><th>Execução</th><th>Registrado por</th><th>Situação</th><th><span className="ind-sr-only">Histórico</span></th></tr></thead><tbody>{sortedRecords.map(record => {
        const asset = equipment.find(item => item.id === record.equipmentId);
        const area = areas.find(item => item.id === asset?.areaId);
        const latest = getLatestSubmission(record);
        const status = getExecutionStatus(record);
        return <tr key={record.id}><td><strong>{asset?.tag ?? 'Equipamento não encontrado'}</strong><small>{asset?.name ?? record.equipmentId}{asset && !asset.active ? ' · Inativo' : ''}</small><small>{area?.name ?? 'Área não encontrada'}</small></td><td><span className="ind-type"><i className={`ind-kind-${record.kind}`} />{kindLabels[record.kind]}</span></td><td>{dateLabel(latest.report.executionDate)}</td><td>{latest.actor}</td><td><span className={`ind-badge ind-badge-${status}`}>{statusLabels[status]}</span></td><td>{asset && area ? <a className="ind-history-link" href={`#/areas/${area.id}/equipamentos/${asset.id}`} aria-label={`Ver histórico de ${asset.tag}, execução em ${dateLabel(latest.report.executionDate)}`}>Histórico <Icon name="arrow" /></a> : <span className="ind-missing">Cadastro indisponível</span>}</td></tr>;
      })}</tbody></table></div> : <div className="ind-empty"><Icon name="history" /><h3>Nenhuma execução neste período</h3><p>Os relatos registrados nos equipamentos aparecerão aqui automaticamente.</p><a href="#/equipamentos">Consultar equipamentos <Icon name="arrow" /></a></div>}
    </section>

    <aside className="ind-note"><Icon name="clock" /><div><strong>Execução e planejamento são etapas diferentes.</strong><p>Este painel acompanha os relatos registrados. Para medir preventivas vencidas ou cumprimento do plano, será necessário cadastrar a programação e os prazos das manutenções.</p></div></aside>
    <p className="workspace-demo-caption">Dados demonstrativos salvos neste navegador. Os perfis simulam o acesso; contas individuais e compartilhamento entre dispositivos ainda não estão disponíveis. Históricos de equipamentos inativos são preservados nos indicadores.</p>
    {(storageWarning || catalogWarning) && <p className="ind-storage-warning" role="alert">{storageWarning || catalogWarning}</p>}
  </section>;
}
