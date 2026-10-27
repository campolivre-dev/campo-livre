import { useId, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { equipmentTypes, jobTitles, roleLabels } from './data';
import type { Area, Collaborator, DemoRole, Equipment, JobTitle } from './data';
import { useWorkspaceData } from './useWorkspaceData';
import './administration.css';

interface AdminPageProps { role: DemoRole; onNavigate: (path: string) => void }
type Tab = 'areas' | 'collaborators' | 'equipment';
const tabs: Tab[] = ['areas', 'collaborators', 'equipment'];
const tabLabels: Record<Tab, string> = { areas: 'Áreas', collaborators: 'Colaboradores', equipment: 'Equipamentos' };
const editorLabels = { area: 'área', collaborator: 'colaborador', equipment: 'equipamento' };
type Status = 'active' | 'inactive' | 'all';
type Editor = { kind: 'area'; id?: string } | { kind: 'collaborator'; id?: string } | { kind: 'equipment'; id?: string };
const accessRoles: DemoRole[] = ['admin', 'supervisor', 'leader', 'technician'];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function AdminPage({ role, onNavigate }: AdminPageProps) {
  if (role !== 'admin') return <section className="admin-page admin-restricted"><p className="admin-eyebrow">ADMINISTRAÇÃO</p><h1>Acesso restrito</h1><p>Somente administradores podem gerenciar áreas, colaboradores e equipamentos. Seu perfil atual é {roleLabels[role]}.</p><button type="button" onClick={() => onNavigate('/mapa')}>Voltar ao mapa</button></section>;
  return <Administration onNavigate={onNavigate} />;
}

function Administration({ onNavigate }: Pick<AdminPageProps, 'onNavigate'>) {
  const workspace = useWorkspaceData({ role: 'admin' });
  const { areas, teams, collaborators, equipment, storageWarning } = workspace;
  const [tab, setTab] = useState<Tab>('areas');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('active');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [equipmentKind, setEquipmentKind] = useState<string>(equipmentTypes[0]);
  const [tag, setTag] = useState('');
  const [areaId, setAreaId] = useState('');
  const [location, setLocation] = useState('');
  const [jobTitle, setJobTitle] = useState<JobTitle>(jobTitles[0]);
  const [teamId, setTeamId] = useState('');
  const [accessRole, setAccessRole] = useState<DemoRole>('technician');
  const [confirmation, setConfirmation] = useState<{ kind: Tab; id: string; name: string; active: boolean } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const prefix = useId();
  const matchesStatus = (active: boolean) => status === 'all' || active === (status === 'active');
  const filteredAreas = areas.filter((area) => matchesStatus(area.active) && normalize(`${area.name} ${area.description}`).includes(normalize(query.trim())));
  const filteredCollaborators = collaborators.filter((person) => {
    const team = teams.find((item) => item.id === person.teamId);
    return matchesStatus(person.active) && normalize(`${person.name} ${person.jobTitle} ${team?.name ?? ''} ${team?.supervisor ?? ''} ${roleLabels[person.accessRole]}`).includes(normalize(query.trim()));
  });
  const filteredEquipment = equipment.filter((item) => matchesStatus(item.active) && normalize(`${item.name} ${item.tag} ${item.kind} ${areas.find((area) => area.id === item.areaId)?.name ?? ''} ${item.location}`).includes(normalize(query.trim())));
  const resultCount = tab === 'areas' ? filteredAreas.length : tab === 'collaborators' ? filteredCollaborators.length : filteredEquipment.length;
  const selectedTeam = teams.find((team) => team.id === teamId);
  const availableTeams = teams.filter((team) => areas.some((area) => area.id === team.areaId && area.active) || team.id === teamId);
  function selectTab(next: Tab) { setTab(next); setQuery(''); setEditor(null); setConfirmation(null); setError(''); }
  function tabKeys(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : tabs[(tabs.indexOf(tab) + (event.key === 'ArrowLeft' ? tabs.length - 1 : 1)) % tabs.length];
    selectTab(next); document.getElementById(`${prefix}-${next}-tab`)?.focus();
  }
  function openArea(area?: Area) { setEditor({ kind: 'area', id: area?.id }); setName(area?.name ?? ''); setDescription(area?.description ?? ''); setConfirmation(null); setError(''); setMessage(''); }
  function openCollaborator(person?: Collaborator) { setEditor({ kind: 'collaborator', id: person?.id }); setName(person?.name ?? ''); setJobTitle(person?.jobTitle ?? jobTitles[0]); setTeamId(person?.teamId ?? ''); setAccessRole(person?.accessRole ?? 'technician'); setConfirmation(null); setError(''); setMessage(''); }
  function openEquipment(item?: Equipment) { setEditor({ kind: 'equipment', id: item?.id }); setName(item?.name ?? equipmentTypes[0]); setEquipmentKind(item?.kind ?? equipmentTypes[0]); setTag(item?.tag ?? ''); setAreaId(item?.areaId ?? areas.find((area) => area.active)?.id ?? ''); setLocation(item?.location ?? ''); setConfirmation(null); setError(''); setMessage(''); }
  function save(event: FormEvent) {
    event.preventDefault(); if (!editor) return;
    const areaInput = { name: name.trim(), description: description.trim() };
    const personInput = { name: name.trim(), jobTitle, teamId: teamId || null, accessRole };
    const validKind = equipmentTypes.find((kind) => kind === equipmentKind);
    if (editor.kind === 'equipment' && !validKind) { setError('Escolha um dos tipos de equipamento disponíveis para salvar este cadastro legado.'); return; }
    const equipmentInput = { name: name.trim(), tag: tag.trim(), kind: validKind ?? equipmentTypes[0], areaId, location: location.trim() };
    const result = editor.kind === 'equipment' ? editor.id ? workspace.updateEquipment(editor.id, equipmentInput) : workspace.addEquipment(equipmentInput) : editor.kind === 'area' ? editor.id ? workspace.updateArea(editor.id, areaInput) : workspace.addArea(areaInput) : editor.id ? workspace.updateCollaborator(editor.id, personInput) : workspace.addCollaborator(personInput);
    if (!result.ok) { setError(result.message); return; }
    const savedLabel = editor.kind === 'area' ? `Área ${editor.id ? 'atualizada' : 'cadastrada'}` : `${editor.kind === 'equipment' ? 'Equipamento' : 'Colaborador'} ${editor.id ? 'atualizado' : 'cadastrado'}`;
    setMessage(`${savedLabel} com sucesso.`);
    setEditor(null); setError(''); setQuery(''); setStatus('all');
  }
  function changeStatus() {
    if (!confirmation) return;
    const result = confirmation.kind === 'equipment' ? workspace.setEquipmentActive(confirmation.id, !confirmation.active) : confirmation.kind === 'areas' ? workspace.setAreaActive(confirmation.id, !confirmation.active) : workspace.setCollaboratorActive(confirmation.id, !confirmation.active);
    if (!result.ok) { setError(result.message); return; }
    setMessage(`${confirmation.name}: cadastro ${confirmation.active ? 'inativado' : 'reativado'}. Os registros históricos foram preservados.`); setConfirmation(null); setError('');
  }
  return <section className="admin-page" aria-labelledby={`${prefix}-title`}>
    <header className="admin-heading"><div><p className="admin-eyebrow">ORGANIZE A OPERAÇÃO</p><h1 id={`${prefix}-title`}>Cadastros<span>.</span></h1><p>Áreas, pessoas e equipamentos conectados ao trabalho de campo.</p></div><span className="admin-access">Acesso de administrador</span></header>
    <div className="admin-stats"><div><strong>{areas.filter((area) => area.active).length.toString().padStart(2, '0')}</strong><span>áreas ativas</span></div><div><strong>{collaborators.filter((person) => person.active).length.toString().padStart(2, '0')}</strong><span>colaboradores ativos</span></div><div><strong>{equipment.filter((item) => item.active).length.toString().padStart(2, '0')}</strong><span>equipamentos ativos</span></div><div><strong>{jobTitles.length.toString().padStart(2, '0')}</strong><span>cargos profissionais</span></div></div>
    {storageWarning && <p className="admin-warning" role="alert">{storageWarning}</p>}
    <div className="admin-tabs" role="tablist" aria-label="Tipo de cadastro">{tabs.map((item) => <button key={item} id={`${prefix}-${item}-tab`} role="tab" aria-selected={tab === item} aria-controls={`${prefix}-${item}-panel`} tabIndex={tab === item ? 0 : -1} onClick={() => selectTab(item)} onKeyDown={tabKeys}>{tabLabels[item]}</button>)}</div>
    <div role="tabpanel" id={`${prefix}-${tab}-panel`} aria-labelledby={`${prefix}-${tab}-tab`}>
      <div className="admin-toolbar"><div><h2>{tab === 'areas' ? 'Áreas da operação' : tab === 'equipment' ? 'Equipamentos da operação' : 'Pessoas da operação'}</h2><p>{tab === 'areas' ? 'Mantenha os locais de trabalho organizados.' : tab === 'equipment' ? 'Ativos de climatização e seu histórico de manutenção.' : 'Cargo, equipe e acesso em um só cadastro.'}</p></div><button className="admin-primary" type="button" onClick={() => tab === 'areas' ? openArea() : tab === 'equipment' ? openEquipment() : openCollaborator()}>+ {tab === 'areas' ? 'Adicionar área' : tab === 'equipment' ? 'Adicionar equipamento' : 'Adicionar colaborador'}</button></div>
      {editor && <form className="admin-editor" onSubmit={save} aria-labelledby={`${prefix}-editor-title`}><h3 id={`${prefix}-editor-title`}>{editor.id ? 'Editar' : 'Adicionar'} {editorLabels[editor.kind]}</h3><div className="admin-form-grid"><label className="admin-wide" htmlFor={`${prefix}-name`}>Nome<input autoFocus id={`${prefix}-name`} required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
        {editor.kind === 'area' ? <label className="admin-wide" htmlFor={`${prefix}-description`}>Descrição <span>(opcional)</span><textarea id={`${prefix}-description`} rows={3} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></label> : editor.kind === 'equipment' ? <><label htmlFor={`${prefix}-tag`}>Identificação (tag)<input id={`${prefix}-tag`} required maxLength={80} value={tag} onChange={(event) => setTag(event.target.value)} /></label><label htmlFor={`${prefix}-equipment-kind`}>Tipo de equipamento<select id={`${prefix}-equipment-kind`} required value={equipmentKind} onChange={(event) => { const next = event.target.value; if (!editor.id && (name === equipmentKind || !name.trim())) setName(next); setEquipmentKind(next); }}>{!equipmentTypes.some((kind) => kind === equipmentKind) && <option value={equipmentKind}>{equipmentKind} (legado)</option>}{equipmentTypes.map((kind) => <option key={kind}>{kind}</option>)}</select></label><label htmlFor={`${prefix}-equipment-area`}>Área<select id={`${prefix}-equipment-area`} required value={areaId} onChange={(event) => setAreaId(event.target.value)}><option value="">Selecione uma área ativa</option>{areas.filter((area) => area.active || area.id === areaId).map((area) => <option key={area.id} value={area.id}>{area.name}{area.active ? '' : ' (inativa)'}</option>)}</select></label><label htmlFor={`${prefix}-location`}>Localização (opcional)<input id={`${prefix}-location`} maxLength={250} value={location} onChange={(event) => setLocation(event.target.value)} /></label></> : <><label htmlFor={`${prefix}-job`}>Cargo profissional<select required id={`${prefix}-job`} value={jobTitle} onChange={(event) => { const value = jobTitles.find((title) => title === event.target.value); if (value) setJobTitle(value); }}>{jobTitles.map((title) => <option key={title}>{title}</option>)}</select></label><label htmlFor={`${prefix}-team`}>Equipe<select id={`${prefix}-team`} value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Sem equipe</option>{availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label htmlFor={`${prefix}-supervisor`}>Supervisor da equipe<input id={`${prefix}-supervisor`} readOnly value={selectedTeam?.supervisor ?? 'Sem supervisor vinculado'} /></label><label htmlFor={`${prefix}-profile`}>Perfil de acesso<select required id={`${prefix}-profile`} aria-describedby={`${prefix}-access-help`} value={accessRole} onChange={(event) => { const value = accessRoles.find((role) => role === event.target.value); if (value) setAccessRole(value); }}>{accessRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label><p className="admin-wide admin-help" id={`${prefix}-access-help`}>O cargo profissional não concede permissões. O perfil de acesso define o que a pessoa pode fazer no sistema.</p></>}
      </div>{editor.kind === 'area' && !editor.id && <p className="admin-help">Depois do cadastro, posicione a área no mapa usando os marcadores disponíveis.</p>}<div className="admin-actions"><button className="admin-primary" type="submit">Salvar {editorLabels[editor.kind]}</button><button type="button" onClick={() => { setEditor(null); setError(''); }}>Cancelar</button></div></form>}
      {message && <p className="admin-success" role="status">{message}</p>}{error && <p className="admin-warning" role="alert">{error}</p>}
      {confirmation && <div className="admin-confirm" role="region" aria-label="Confirmar alteração de cadastro"><h3>{confirmation.active ? 'Inativar' : 'Reativar'} {confirmation.name}?</h3><p>{confirmation.active ? 'O cadastro deixará de aparecer nas opções ativas. Equipamentos, atividades e registros históricos serão preservados.' : 'O cadastro voltará a aparecer entre os ativos, com seus registros preservados.'}</p><div className="admin-actions"><button type="button" className="admin-primary" autoFocus onClick={changeStatus}>Confirmar {confirmation.active ? 'inativação' : 'reativação'}</button><button type="button" onClick={() => { setConfirmation(null); setError(''); }}>Cancelar</button></div></div>}
      <div className="admin-filters"><label htmlFor={`${prefix}-search`}>Buscar {tabLabels[tab].toLocaleLowerCase('pt-BR')}<input id={`${prefix}-search`} type="search" placeholder={tab === 'areas' ? 'Nome ou descrição' : tab === 'equipment' ? 'Nome, tag, tipo ou área' : 'Nome, cargo, equipe ou supervisor'} value={query} onChange={(event) => setQuery(event.target.value)} /></label><label htmlFor={`${prefix}-status`}>Situação<select id={`${prefix}-status`} value={status} onChange={(event) => { const value = event.target.value; if (value === 'active' || value === 'inactive' || value === 'all') setStatus(value); }}><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option></select></label></div>
      <p className="admin-result" aria-live="polite">{resultCount} cadastro(s) encontrado(s)</p>
      <div className={`admin-records ${tab !== 'collaborators' ? 'admin-area-grid' : ''}`}>{tab === 'areas' ? filteredAreas.map((area) => <article className="admin-record" key={area.id}><div className="admin-record-title"><h3>{area.name}</h3><span className={`admin-badge ${area.active ? 'is-active' : ''}`}>{area.active ? 'Ativa' : 'Inativa'}</span></div><p className="admin-description">{area.description || 'Sem descrição informada.'}</p><p className="admin-area-counts">{area.equipmentIds.length} equipamentos <span>·</span> {area.teamIds.length} equipes</p><div className="admin-actions"><button type="button" aria-label={`Editar área ${area.name}`} onClick={() => openArea(area)}>Editar</button><button type="button" onClick={() => onNavigate(`/areas/${area.id}`)}>Ver área</button><button type="button" className="admin-status-action" onClick={() => { setConfirmation({ kind: 'areas', id: area.id, name: area.name, active: area.active }); setError(''); }}>{area.active ? 'Inativar' : 'Reativar'}</button></div></article>) : tab === 'equipment' ? filteredEquipment.map((item) => <article className="admin-record" key={item.id}><div className="admin-record-title"><h3>{item.name}</h3><span className={`admin-badge ${item.active ? 'is-active' : ''}`}>{item.active ? 'Ativo' : 'Inativo'}</span></div><dl className="admin-person-details admin-equipment-details"><div><dt>Identificação (tag)</dt><dd>{item.tag}</dd></div><div><dt>Tipo</dt><dd>{item.kind}</dd></div><div><dt>Área</dt><dd>{areas.find((area) => area.id === item.areaId)?.name ?? 'Área não encontrada'}</dd></div><div><dt>Localização</dt><dd>{item.location || 'Não informada'}</dd></div></dl><div className="admin-actions"><button type="button" aria-label={`Editar equipamento ${item.name}`} onClick={() => openEquipment(item)}>Editar</button><button type="button" onClick={() => onNavigate(`/areas/${item.areaId}/equipamentos/${item.id}`)}>Ver histórico</button><button type="button" className="admin-status-action" onClick={() => { setConfirmation({ kind: 'equipment', id: item.id, name: item.name, active: item.active }); setError(''); }}>{item.active ? 'Inativar' : 'Reativar'}</button></div></article>) : filteredCollaborators.map((person) => { const team = teams.find((item) => item.id === person.teamId); return <article className="admin-record" key={person.id}><div className="admin-record-title"><h3>{person.name}</h3><span className={`admin-badge ${person.active ? 'is-active' : ''}`}>{person.active ? 'Ativo' : 'Inativo'}</span></div><dl className="admin-person-details"><div><dt>Cargo profissional</dt><dd>{person.jobTitle}</dd></div><div><dt>Equipe</dt><dd>{team?.name ?? 'Sem equipe'}</dd></div><div><dt>Supervisor</dt><dd>{team?.supervisor ?? 'Sem vínculo'}</dd></div><div><dt>Perfil de acesso</dt><dd>{roleLabels[person.accessRole]}</dd></div></dl><div className="admin-actions"><button type="button" aria-label={`Editar colaborador ${person.name}`} onClick={() => openCollaborator(person)}>Editar</button><button type="button" className="admin-status-action" onClick={() => { setConfirmation({ kind: 'collaborators', id: person.id, name: person.name, active: person.active }); setError(''); }}>{person.active ? 'Inativar' : 'Reativar'}</button></div></article>; })}</div>
      {!resultCount && <div className="admin-empty"><h3>Nenhum cadastro encontrado</h3><p>Revise a busca e a situação selecionada ou adicione um cadastro.</p><button type="button" onClick={() => { setQuery(''); setStatus('all'); }}>Mostrar todos</button></div>}
    </div><p className="admin-note">Ambiente de demonstração · Cadastros salvos neste navegador. Inativar preserva o histórico.</p>
  </section>;
}
