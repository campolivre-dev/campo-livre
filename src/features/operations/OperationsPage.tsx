import { useId, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import { useWorkspaceData } from './useWorkspaceData';
import type { Area, DemoRole, Equipment } from './data';
import { getExecutionStatus, getLatestSubmission, kindLabels, localDate, statusLabels, summarizeExecutions } from './model';
import type { ExecutionKind, ExecutionPhoto, ExecutionRecord, ExecutionReport } from './model';
import { useOperations } from './useOperations';
import type { OperationResult } from './useOperations';
import './operations.css';
import './teams.css';

interface OperationsPageProps {
  areaId: string;
  equipmentId?: string;
  role: DemoRole;
  onNavigate: (path: string) => void;
}
type Operations = ReturnType<typeof useOperations>;

function displayDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
function displayMoment(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('');
}

function RouteLink({ path, children, onNavigate, className = '' }: { path: string; children: React.ReactNode; onNavigate: OperationsPageProps['onNavigate']; className?: string }) {
  return <a className={className} href={`#${path}`} onClick={(event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onNavigate(path);
  }}>{children}</a>;
}

function DemoNotice({ warning }: { warning: string }) {
  return <>
    <div className="op-demo"><span className="op-live-dot" /><p><strong>Ambiente de demonstração.</strong> Áreas, pessoas e equipamentos são fictícios. Os registros ficam neste navegador; o perfil selecionado apenas demonstra o fluxo.</p></div>
    {warning && <p className="op-storage-warning" role="alert">{warning}</p>}
  </>;
}

function StatusBadge({ record }: { record: ExecutionRecord }) {
  const status = getExecutionStatus(record);
  return <span className={`op-status op-status-${status}`}><span />{statusLabels[status]}</span>;
}

export function OperationsPage({ areaId, equipmentId, role, onNavigate }: OperationsPageProps) {
  const { areas, equipment } = useWorkspaceData();
  const operations = useOperations();
  const area = areas.find((item) => item.id === areaId);
  const asset = equipmentId ? equipment.find((item) => item.id === equipmentId && item.areaId === areaId) : undefined;
  if (!area || (equipmentId && !asset)) return <section className="op-page" aria-label="Local não encontrado"><div className="op-empty"><h1>Este local não foi encontrado</h1><p>Volte ao mapa para escolher uma área ou um equipamento.</p><RouteLink path="/mapa" onNavigate={onNavigate} className="op-button op-button-primary">Voltar ao mapa</RouteLink></div></section>;
  return <section className="op-page" aria-label={asset ? `Equipamento: ${asset.name}` : `Área: ${area.name}`}>
    <nav className="op-breadcrumb" aria-label="Caminho da página">
      <RouteLink path="/mapa" onNavigate={onNavigate}>Mapa da operação</RouteLink><span aria-hidden="true">/</span>
      {asset ? <><RouteLink path={`/areas/${area.id}`} onNavigate={onNavigate}>{area.name}</RouteLink><span aria-hidden="true">/</span><span aria-current="page">{asset.tag}</span></> : <span aria-current="page">{area.name}</span>}
    </nav>
    {!area.active && <p className="op-storage-warning" role="status">Área inativa. Os equipamentos e históricos continuam disponíveis para consulta.</p>}
    {asset && !asset.active && <p className="op-storage-warning" role="status">Equipamento inativo. O histórico de manutenção foi preservado.</p>}
    {asset ? <EquipmentDetail key={`${asset.id}:${role}`} asset={asset} area={area} operations={operations} role={role} onNavigate={onNavigate} /> : <AreaDetail area={area} operations={operations} onNavigate={onNavigate} />}
    <DemoNotice warning={operations.storageWarning} />
  </section>;
}

function AreaDetail({ area, operations, onNavigate }: { area: Area; operations: Operations; onNavigate: OperationsPageProps['onNavigate'] }) {
  const { teams, collaborators, equipment } = useWorkspaceData();
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const monthId = useId();
  const assets = equipment.filter((item) => area.equipmentIds.includes(item.id));
  const areaTeams = teams.filter((team) => area.teamIds.includes(team.id));
  const records = operations.records.filter((record) => area.equipmentIds.includes(record.equipmentId));
  const summary = summarizeExecutions(records, month);
  return <>
    <header className="op-heading"><div><p className="op-eyebrow">ÁREA DA OPERAÇÃO · EXEMPLO</p><h1>{area.name}<span className="op-title-dot">.</span></h1><p className="op-lead">{area.description}</p></div><RouteLink path="/mapa" onNavigate={onNavigate} className="op-button op-button-light"><span aria-hidden="true">↗</span> Ver no mapa</RouteLink></header>
    <div className="op-metric-period"><p>Equipamentos e aprovações atuais. Preventivas por mês de execução.</p><label htmlFor={monthId}>Mês das preventivas<input id={monthId} type="month" value={month} onChange={(event) => { if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value); }} /></label></div>
    <div className="op-metrics">
      <div><span>Equipamentos cadastrados</span><strong>{assets.length.toString().padStart(2, '0')}</strong><small>Histórico disponível para a equipe</small></div>
      <div><span>Aguardando aprovação</span><strong>{summary.pendingApproval.toString().padStart(2, '0')}</strong><small>Execuções para o supervisor revisar</small></div>
      <div><span>Preventivas no mês selecionado</span><strong aria-live="polite" aria-atomic="true">{summary.preventivesThisMonth.toString().padStart(2, '0')}</strong><small>Aprovadas, pela data de execução</small></div>
    </div>
    <div className="op-area-layout"><section className="op-section"><div className="op-section-heading"><div><p className="op-eyebrow">CONHEÇA CADA ATIVO</p><h2>Equipamentos da área</h2></div><span className="op-count">{assets.length}</span></div>
      <div className="op-equipment-list">{assets.map((asset) => {
        const assetRecords = records.filter((record) => record.equipmentId === asset.id);
        const pending = assetRecords.filter((record) => getExecutionStatus(record) === 'pending').length;
        const returned = assetRecords.filter((record) => getExecutionStatus(record) === 'returned').length;
        return <RouteLink key={asset.id} path={`/areas/${area.id}/equipamentos/${asset.id}`} onNavigate={onNavigate} className="op-equipment-card">
          <span className="op-equipment-icon"><Icon name="layers" /></span><div><span className="op-tag">{asset.tag} · {asset.kind}</span><h3>{asset.name}{!asset.active && <small className="op-inactive-label">Inativo</small>}</h3><p>{assetRecords.length} {assetRecords.length === 1 ? 'registro no histórico' : 'registros no histórico'}{pending ? ` · ${pending} aguardando aprovação` : ''}{returned ? ` · ${returned} para correção` : ''}</p></div><Icon name="arrow" />
        </RouteLink>;
      })}</div>
      {!assets.length && <div className="op-empty"><p>Este setor ainda não tem equipamentos cadastrados.</p></div>}
      <div className="op-context-note"><span className="op-note-icon"><Icon name="check" /></span><div><strong>O próximo técnico começa com contexto.</strong><p>O relato de cada execução fica ligado ao equipamento, com alterações, pendências e a revisão do supervisor.</p></div></div>
    </section>
    <aside className="op-team-panel"><p className="op-eyebrow">PESSOAS DA ÁREA</p><h2>Equipes designadas</h2><p className="op-muted">A designação indica responsabilidade pela área, sem rastreamento de pessoas.</p>
      {areaTeams.map((team) => <section className="op-team" key={team.id}><img className="op-team-image" src={team.image} alt={team.imageAlt} /><p className="op-team-supervisor">Supervisor <strong>{team.supervisor}</strong></p><h3>{team.name}<span>{team.members.length}</span></h3><ul>{collaborators.filter(person => person.active && person.teamId === team.id && person.id !== team.supervisorId).map((member) => <li key={member.id}><span className="op-avatar">{initials(member.name)}</span><div><strong>{member.name}</strong><span>{member.jobTitle}</span></div></li>)}</ul></section>)}
    </aside></div>
  </>;
}

function EquipmentDetail({ asset, area, operations, role, onNavigate }: { asset: Equipment; area: Area; operations: Operations; role: DemoRole; onNavigate: OperationsPageProps['onNavigate'] }) {
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const records = operations.records.filter((record) => record.equipmentId === asset.id);
  const completeCount = records.filter((record) => getExecutionStatus(record) === 'completed').length;
  return <>
    <header className="op-heading"><div><p className="op-eyebrow">{asset.tag} · {asset.kind}</p><h1>{asset.name}<span className="op-title-dot">.</span></h1><p className="op-lead">{asset.location}</p></div>
      {role === 'technician' && area.active && asset.active && <button type="button" className="op-button op-button-primary" onClick={() => setCreating(!creating)} aria-expanded={creating} aria-controls="op-new-execution"><span aria-hidden="true">{creating ? '−' : '+'}</span> {creating ? 'Fechar formulário' : 'Registrar execução'}</button>}
    </header>
    <div className="op-equipment-layout"><section>
      {notice && <p className="op-success" role="status">{notice}</p>}
      {creating && role === 'technician' && area.active && asset.active && <section id="op-new-execution" className="op-form-panel"><p className="op-eyebrow">RELATO DE EXECUÇÃO</p><h2>Registrar execução</h2><p className="op-muted">Depois do envio, o supervisor revisa o relato e aprova a conclusão.</p><ReportForm onCancel={() => setCreating(false)} onSubmit={(report, kind) => {
        const result = operations.submitExecution(asset.id, kind, report, role);
        if (result.ok) { setCreating(false); setNotice(result.message); }
        return result;
      }} /></section>}
      {role === 'technician' && <p className="op-muted op-history-hint">Técnicos e auxiliares podem consultar serviços anteriores, alterações e pendências para preparar o próximo atendimento.</p>}
      <div className="op-section-heading"><div><p className="op-eyebrow">MEMÓRIA DO EQUIPAMENTO</p><h2>Histórico de manutenção</h2></div><span className="op-count">{records.length}</span></div>
      {records.length ? <div className="op-records">{records.map((record) => <ExecutionCard key={record.id} record={record} role={role} operations={operations} />)}</div> : <div className="op-empty"><span className="op-equipment-icon"><Icon name="layers" /></span><h3>O histórico começa aqui</h3><p>Nenhuma execução foi registrada para este equipamento. Técnicos e auxiliares podem adicionar o primeiro relato.</p></div>}
    </section><aside className="op-asset-panel"><span className="op-equipment-icon op-icon-large"><Icon name="layers" /></span><p className="op-eyebrow">FICHA DO EQUIPAMENTO</p><h2>{asset.tag}</h2><dl><div><dt>Área designada</dt><dd><RouteLink path={`/areas/${area.id}`} onNavigate={onNavigate}>{area.name} ↗</RouteLink></dd></div><div><dt>Tipo</dt><dd>{asset.kind}</dd></div><div><dt>Execuções aprovadas</dt><dd>{completeCount.toString().padStart(2, '0')}</dd></div><div><dt>Cadastro</dt><dd>Demonstrativo</dd></div></dl><div className="op-aside-tip"><strong>Uma informação, vários usos.</strong><p>Cada relato alimenta este histórico. As preventivas só entram nos indicadores após a aprovação, no mês em que foram executadas.</p></div>{role === 'supervisor' && <p className="op-muted op-role-hint">Para experimentar o envio de uma execução, selecione o perfil Técnico / Auxiliar no topo da página.</p>}</aside></div>
  </>;
}

function ExecutionCard({ record, role, operations }: { record: ExecutionRecord; role: DemoRole; operations: Operations }) {
  const [returning, setReturning] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<OperationResult | null>(null);
  const reasonId = useId();
  const latest = getLatestSubmission(record);
  const status = getExecutionStatus(record);
  const lastEvent = record.events.at(-1);
  const { report } = latest;
  return <article className="op-record">
    <div className="op-record-top"><span className="op-kind">{kindLabels[record.kind]}</span><StatusBadge record={record} /></div>
    <h3>Execução em {displayDate(report.executionDate)}</h3><p className="op-record-author"><span className="op-avatar op-avatar-small">{initials(latest.actor)}</span>{latest.actor}<span>· Registro demonstrativo</span></p>
    <p className="op-report-description">{report.description}</p>
    <dl className="op-report-fields"><div><dt>Alterações no equipamento</dt><dd>{report.changes || 'Não informadas neste relato.'}</dd></div><div><dt>Pendências identificadas</dt><dd>{report.pending || 'Não informadas neste relato.'}</dd></div></dl>
    {report.photos.length > 0 && <div className="op-photos">{report.photos.map((photo, index) => <a key={`${photo.name}-${index}`} href={photo.dataUrl} download={photo.name}><img src={photo.dataUrl} alt={`Foto da execução: ${photo.name}`} /><span>Baixar {photo.name}</span></a>)}</div>}
    {lastEvent?.type === 'returned' && <div className="op-return-note"><strong>Correção solicitada pelo supervisor</strong><p>{lastEvent.reason}</p></div>}
    <details className="op-event-history"><summary>Ver trilha do registro <span>{record.events.length} {record.events.length === 1 ? 'evento' : 'eventos'}</span></summary><ol>{record.events.map((event, index) => <li key={`${event.at}-${index}`}><span className={`op-event-dot op-event-${event.type}`} /><div><strong>{event.type === 'approved' ? 'Conclusão aprovada' : event.type === 'returned' ? 'Devolução para correção' : index === 0 ? 'Execução enviada' : 'Relato complementado e reenviado'}</strong><span>{event.actor} · {displayMoment(event.at)}</span>{event.type === 'returned' && <p>{event.reason}</p>}{event.type === 'submitted' && <><p>{event.report.description}</p><p><b>Data da execução:</b> {displayDate(event.report.executionDate)}</p><p><b>Alterações:</b> {event.report.changes || 'Não informadas.'}</p><p><b>Pendências:</b> {event.report.pending || 'Não informadas.'}</p>{event.report.photos.length > 0 && <div className="op-history-photos">{event.report.photos.map((photo, photoIndex) => <a key={`${photo.name}-${photoIndex}`} href={photo.dataUrl} download={photo.name}>Baixar {photo.name}</a>)}</div>}</>}</div></li>)}</ol></details>
    {role === 'supervisor' && status === 'pending' && <div className="op-record-actions"><button className="op-button op-button-primary" type="button" onClick={() => { setResult(operations.approveExecution(record.id, role)); setReturning(false); }}><Icon name="check" /> Aprovar conclusão</button><button className="op-button op-button-light" type="button" aria-expanded={returning} onClick={() => setReturning(!returning)}>Devolver para correção</button></div>}
    {role === 'supervisor' && status === 'pending' && returning && <form className="op-return-form" onSubmit={(event) => { event.preventDefault(); const answer = operations.returnExecution(record.id, reason, role); setResult(answer); if (answer.ok) setReturning(false); }}><label htmlFor={reasonId}>Motivo da devolução <span>(obrigatório)</span></label><textarea id={reasonId} value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={3000} rows={3} placeholder="Explique o que precisa ser complementado para o técnico reenviar." /><button className="op-button op-button-primary" type="submit">Enviar para correção</button></form>}
    {role === 'technician' && status === 'returned' && <><button className="op-button op-button-light op-correct-button" type="button" aria-expanded={correcting} onClick={() => setCorrecting(!correcting)}>{correcting ? 'Cancelar complemento' : 'Complementar e reenviar'}</button>{correcting && <ReportForm initial={report} initialKind={record.kind} onCancel={() => setCorrecting(false)} onSubmit={(updatedReport) => { const answer = operations.resubmitExecution(record.id, updatedReport, role); setResult(answer); if (answer.ok) setCorrecting(false); return answer; }} />}</>}
    {result && <p className={result.ok ? 'op-success' : 'op-error'} role={result.ok ? 'status' : 'alert'}>{result.message}</p>}
  </article>;
}

function ReportForm({ initial, initialKind = 'preventiva', onSubmit, onCancel }: { initial?: ExecutionReport; initialKind?: ExecutionKind; onSubmit: (report: ExecutionReport, kind: ExecutionKind) => OperationResult; onCancel: () => void }) {
  const id = useId();
  const [kind, setKind] = useState<ExecutionKind>(initialKind);
  const [date, setDate] = useState(initial?.executionDate ?? localDate());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [changes, setChanges] = useState(initial?.changes ?? '');
  const [pending, setPending] = useState(initial?.pending ?? '');
  const [photos, setPhotos] = useState<ExecutionPhoto[]>(initial?.photos ?? []);
  const [error, setError] = useState('');
  const [readingPhotos, setReadingPhotos] = useState(false);

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.currentTarget.files ?? [])];
    event.currentTarget.value = '';
    if (!files.length) return;
    if (photos.length + files.length > 2 || files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 500 * 1024)) {
      setError('Escolha até duas fotos JPG, PNG ou WebP de até 500 KB cada.'); return;
    }
    setReadingPhotos(true); setError('');
    try {
      const loaded = await Promise.all(files.map((file) => new Promise<ExecutionPhoto>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve({ name: file.name, dataUrl: reader.result }) : reject(new Error('Não foi possível ler a foto.'));
        reader.onerror = () => reject(new Error('Não foi possível ler a foto.'));
        reader.readAsDataURL(file);
      })));
      setPhotos((previous) => [...previous, ...loaded]);
    } catch { setError('Não foi possível ler as fotos selecionadas. Tente novamente.'); }
    finally { setReadingPhotos(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readingPhotos) return;
    const answer = onSubmit({ executionDate: date, description, changes, pending, photos }, kind);
    if (!answer.ok) setError(answer.message);
  }
  return <form className="op-report-form" onSubmit={submit}>
    <div className="op-form-row"><div><label htmlFor={`${id}-kind`}>Tipo de atividade</label><select id={`${id}-kind`} value={kind} disabled={Boolean(initial)} onChange={(event) => { const value = event.target.value; if (value === 'preventiva' || value === 'corretiva' || value === 'inspecao') setKind(value); }}><option value="preventiva">Preventiva</option><option value="corretiva">Corretiva</option><option value="inspecao">Inspeção</option></select></div><div><label htmlFor={`${id}-date`}>Data da execução</label><input id={`${id}-date`} type="date" required max={localDate()} value={date} onChange={(event) => setDate(event.target.value)} /></div></div>
    <label htmlFor={`${id}-description`}>Trabalho realizado <span>(obrigatório)</span></label><textarea id={`${id}-description`} required rows={4} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva o que você fez e o resultado da verificação." />
    <label htmlFor={`${id}-changes`}>Alterações no equipamento <span>(opcional)</span></label><textarea id={`${id}-changes`} rows={2} maxLength={3000} value={changes} onChange={(event) => setChanges(event.target.value)} placeholder="Peças substituídas, ajustes ou outras alterações." />
    <label htmlFor={`${id}-pending`}>Pendências identificadas <span>(opcional)</span></label><textarea id={`${id}-pending`} rows={2} maxLength={3000} value={pending} onChange={(event) => setPending(event.target.value)} placeholder="O que o próximo técnico precisa acompanhar?" />
    <label htmlFor={`${id}-photos`}>Fotos da execução <span>(opcional)</span></label><input id={`${id}-photos`} className="op-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={readingPhotos || photos.length >= 2} onChange={addPhotos} aria-describedby={`${id}-photo-hint`} /><p id={`${id}-photo-hint`} className="op-field-hint">Até 2 fotos de 500 KB cada, salvas apenas neste navegador.</p>
    {photos.length > 0 && <ul className="op-attachment-list">{photos.map((photo, index) => <li key={`${photo.name}-${index}`}><img src={photo.dataUrl} alt="" /><span>{photo.name}</span><button type="button" onClick={() => setPhotos((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover foto ${photo.name}`}>Remover</button></li>)}</ul>}
    {initial && <p className="op-field-hint">O relato anterior permanece na trilha do registro após o reenvio.</p>}
    {error && <p className="op-error" role="alert">{error}</p>}
    <div className="op-form-actions"><button type="submit" className="op-button op-button-primary" disabled={readingPhotos}>{readingPhotos ? 'Lendo fotos…' : initial ? 'Reenviar para aprovação' : 'Enviar para aprovação'}<Icon name="arrow" /></button><button type="button" className="op-button op-button-text" onClick={onCancel}>Cancelar</button></div>
  </form>;
}
