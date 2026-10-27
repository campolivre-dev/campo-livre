import { useId, useState } from 'react';
import { Icon } from '../../components/Icon';
import { useWorkspaceData } from './useWorkspaceData';
import type { AccessContext } from './workspaceModel';
import './teams.css';

interface TeamsPageProps {
  access: AccessContext;
  onNavigate: (path: string) => void;
}

function searchable(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function TeamsPage({ access, onNavigate }: TeamsPageProps) {
  const { areas, teams, collaborators, storageWarning, assignCollaborator, setTeamArea } = useWorkspaceData(access);
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<{ teamId: string; areaId: string; memberIds: string[] } | null>(null);
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);
  const searchId = useId();
  const filteredTeams = teams.filter((team) => searchable([
    team.name, team.supervisor,
    ...collaborators.filter((person) => person.teamId === team.id && person.active).flatMap((person) => [person.name, person.jobTitle]),
    ...areas.filter((area) => area.id === team.areaId).map((area) => area.name),
  ].join(' ')).includes(searchable(query.trim())));

  function saveOrganization() {
    if (!editor) return;
    const team = teams.find((item) => item.id === editor.teamId);
    if (!team) return;
    const changes = collaborators.filter((person) => person.id !== team.supervisorId && person.active && (
      (person.teamId === team.id && !editor.memberIds.includes(person.id)) ||
      (person.teamId !== team.id && editor.memberIds.includes(person.id))
    ));
    if (changes.some((person) => person.teamId !== null && person.teamId !== team.id)) {
      setNotice({ error: true, message: 'Uma vinculação mudou. Cancele e abra a organização novamente para conferir os colaboradores.' });
      return;
    }
    if (editor.areaId !== team.areaId) {
      const result = setTeamArea(team.id, editor.areaId);
      if (!result.ok) { setNotice({ error: true, message: result.message }); return; }
    }
    for (const person of changes) {
      const result = assignCollaborator(person.id, editor.memberIds.includes(person.id) ? team.id : null);
      if (!result.ok) { setNotice({ error: true, message: `${result.message} Confira as alterações já salvas antes de tentar novamente.` }); return; }
    }
    setEditor(null);
    setNotice({ error: false, message: 'Organização da equipe atualizada. Os históricos foram preservados.' });
  }

  return <section className="teams-page" aria-labelledby="teams-title">
    <header className="teams-heading">
      <div><p className="teams-eyebrow">PESSOAS QUE MOVEM A OPERAÇÃO</p><h1 id="teams-title">Nossas equipes<span>.</span></h1><p>Um cuidado compartilhado com cada área.</p></div>
      <div className="teams-total"><Icon name="people" /><strong>{String(teams.length).padStart(2, '0')}</strong><span>equipes de campo</span></div>
    </header>
    <div className="teams-toolbar">
      <div><h2>Conheça quem está à frente</h2><p>Colaboradores, cargos profissionais e suas áreas designadas.</p></div>
      <div className="teams-search"><label htmlFor={searchId}>Buscar equipes</label><div><Icon name="search" /><input id={searchId} type="search" disabled={editor !== null} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Colaborador, cargo ou área" /></div></div>
    </div>
    {storageWarning && <p className="teams-feedback teams-feedback-error" role="alert">{storageWarning}</p>}
    {notice && <p className={`teams-feedback${notice.error ? ' teams-feedback-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</p>}
    <p className="teams-result-count" aria-live="polite">{filteredTeams.length} {filteredTeams.length === 1 ? 'equipe encontrada' : 'equipes encontradas'}</p>
    <div className="teams-grid">{filteredTeams.map((team) => {
      const assignedAreas = areas.filter((area) => area.id === team.areaId);
      const members = collaborators.filter((person) => person.teamId === team.id && person.active);
      const canOrganize = access.role === 'admin' || (access.role === 'supervisor' && access.teamId === team.id);
      const isEditing = editor?.teamId === team.id && canOrganize;
      const available = collaborators.filter((person) => person.active && person.id !== team.supervisorId && (person.teamId === null || person.teamId === team.id));
      return <article className="team-card" key={team.id} aria-labelledby={`team-${team.id}`}>
        <div className="team-art"><img src={team.image} alt={team.imageAlt} /><span className="team-art-label"><Icon name="people" /> {team.name}</span></div>
        <div className="team-card-body"><p className="team-supervisor-label">Supervisor</p><h2 id={`team-${team.id}`}>{team.supervisor}</h2>
          <div className="team-members-heading"><h3>Colaboradores ativos</h3><span>{members.length.toString().padStart(2, '0')}</span></div>
          <ul className="team-members">{members.map((member) => <li key={member.id}><span aria-hidden="true">{member.name.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span><div>{member.name}<small>{member.jobTitle}</small></div></li>)}</ul>
          {!members.length && <p className="team-members-empty">Nenhum colaborador ativo vinculado.</p>}
          <div className="team-areas"><h3>Área designada</h3>{assignedAreas.map((area) => <a key={area.id} href={`#/areas/${area.id}`} onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); onNavigate(`/areas/${area.id}`);
          }}><Icon name="pin" /><span>{area.name}{!area.active && <small className="team-inactive">Inativa · consultar histórico</small>}</span><Icon name="arrow" /></a>)}</div>
          {canOrganize && !isEditing && <button className="team-organize" type="button" disabled={editor !== null} onClick={() => {
            setEditor({ teamId: team.id, areaId: team.areaId, memberIds: members.map((person) => person.id) }); setNotice(null);
          }}>Organizar equipe<span className="team-sr-only"> {team.name}</span></button>}
          {isEditing && editor && <form className="team-editor" aria-label={`Organizar ${team.name}`} onSubmit={(event) => { event.preventDefault(); saveOrganization(); }}>
            <h3>Organizar {team.name}</h3>
            <p>Escolha a área e os colaboradores. As alterações só serão aplicadas ao salvar.</p>
            <label htmlFor={`team-area-${team.id}`}>Área designada</label>
            <select id={`team-area-${team.id}`} value={editor.areaId} onChange={(event) => setEditor({ ...editor, areaId: event.target.value })}>
              {areas.filter((area) => area.active || area.id === team.areaId).map((area) => <option key={area.id} value={area.id} disabled={!area.active}>{area.name}{!area.active ? ' (Inativa)' : ''}</option>)}
            </select>
            <h4>Colaboradores disponíveis</h4>
            <p>O supervisor responsável permanece vinculado. Pessoas inativas mantêm seu histórico.</p>
            <ul className="team-editor-members">{available.map((person) => {
              const selected = editor.memberIds.includes(person.id);
              return <li key={person.id}><div><strong>{person.name}</strong><small>{person.jobTitle}</small></div><button type="button" aria-label={`${selected ? 'Remover' : 'Adicionar'} ${person.name} ${selected ? 'da' : 'à'} equipe`} onClick={() => setEditor({ ...editor, memberIds: selected ? editor.memberIds.filter((id) => id !== person.id) : [...editor.memberIds, person.id] })}>{selected ? 'Remover' : 'Adicionar'}</button></li>;
            })}</ul>
            {!available.length && <p>Nenhum colaborador disponível para organização.</p>}
            <div className="team-editor-actions"><button type="submit">Salvar organização</button><button type="button" onClick={() => { setEditor(null); setNotice(null); }}>Cancelar</button></div>
          </form>}
        </div>
      </article>;
    })}</div>
    {!filteredTeams.length && <div className="teams-empty"><Icon name="search" /><h2>Nenhuma equipe encontrada</h2><p>Tente o nome de um colaborador, cargo ou área.</p><button type="button" onClick={() => setQuery('')}>Limpar busca</button></div>}
    <p className="teams-note"><span aria-hidden="true" />Ambiente de demonstração · Alterações são salvas neste navegador. A designação indica responsabilidade pela área, sem rastreamento de pessoas.</p>
  </section>;
}
