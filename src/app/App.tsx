import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { LoginPage } from '../features/auth/LoginPage';
import { roleLabels } from '../features/operations/data';
import type { DemoRole } from '../features/operations/data';
import { useWorkspaceData } from '../features/operations/useWorkspaceData';
import { PowerOn } from './PowerOn';
import '../styles/workspace.css';
import { MOBILE_MAP_QUERY } from '../features/map/mobileMap';

const MapHub = lazy(() => import('../features/map/MapHub').then(module => ({ default: module.MapHub })));
const OperationsPage = lazy(() => import('../features/operations/OperationsPage').then(module => ({ default: module.OperationsPage })));
const TeamsPage = lazy(() => import('../features/operations/TeamsPage').then(module => ({ default: module.TeamsPage })));
const AdminPage = lazy(() => import('../features/operations/AdminPage').then(module => ({ default: module.AdminPage })));
const IndicatorsPage = lazy(() => import('../features/operations/IndicatorsPage').then(module => ({ default: module.IndicatorsPage })));
const DEMO_SESSION = 'campo-livre:demo-session';
const readPath = () => window.location.hash.slice(1) || '/mapa';

function readSession() {
  try { return window.sessionStorage.getItem(DEMO_SESSION) === 'active'; }
  catch { return false; }
}

function Directory({ kind, onNavigate }: { kind: string; onNavigate: (path: string) => void }) {
  const { areas, equipment } = useWorkspaceData();
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const title = kind === 'equipamentos' ? 'Equipamentos e histórias' : 'Cada área, conectada';
  const description = kind === 'equipamentos' ? 'Encontre um equipamento e veja o que já foi feito.' : 'Acesse equipamentos, equipes e informações do trabalho.';
  const matches = (name: string) => name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
  const items = kind === 'equipamentos'
    ? equipment.filter(item => showInactive || (item.active && areas.some(area => area.id === item.areaId && area.active))).map(item => ({ id: item.id, title: item.name, description: item.location, meta: `${item.active ? '' : 'Inativo · '}${item.tag} · ${item.kind}`, path: `/areas/${item.areaId}/equipamentos/${item.id}` }))
    : areas.filter(area => area.active || showInactive).map(area => ({ id: area.id, title: area.name, description: area.description, meta: `${area.active ? '' : 'Inativa · '}${area.equipmentIds.length} equipamentos · ${area.teamIds.length} equipe`, path: `/areas/${area.id}` }));
  const shown = items.filter(item => matches(`${item.title} ${item.meta} ${item.description}`));
  return <>
    <div className="workspace-page-heading"><div><div className="workspace-eyebrow">CAMPOLIVRE / {kind.toUpperCase()}</div><h1>{title}<span>.</span></h1><p>{description}</p></div></div>
    <label className="hub-search directory-search"><Icon name="search" /><input type="search" aria-label={`Buscar ${kind}`} value={query} onChange={event => setQuery(event.target.value)} placeholder={`Buscar ${kind}…`} /></label>
    <label className="directory-inactive"><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} />{kind === 'areas' ? 'Incluir áreas inativas' : 'Incluir equipamentos e áreas inativos'}</label>
    <div className="directory-grid">{shown.map(item => <article className="directory-card" key={item.id}><span className="directory-card-icon"><Icon name={kind === 'equipamentos' ? 'equipment' : 'map'} /></span><small>{item.meta}</small><h2>{item.title}</h2><p>{item.description}</p><button type="button" onClick={() => onNavigate(item.path)}>{kind === 'equipamentos' ? 'Ver equipamento e histórico' : 'Abrir área'}<Icon name="arrow" /></button></article>)}</div>
    {!shown.length && <p className="workspace-empty">Nenhum resultado encontrado. Tente outro nome.</p>}
    <p className="workspace-demo-caption">Cadastros demonstrativos. As equipes representam áreas designadas, sem rastreamento de localização.</p>
  </>;
}

export function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(readSession);
  const [path, setPath] = useState(readPath);
  const [role, setRole] = useState<DemoRole>('admin');
  const [teamId, setTeamId] = useState('mecanica');
  const { teams } = useWorkspaceData();
  const access = { role, teamId };
  const [booting, setBooting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const handleMapReady = useCallback(() => setMapReady(true), []);
  const revealMap = useCallback(() => setRevealing(true), []);
  const finishBoot = useCallback(() => setBooting(false), []);
  useEffect(() => {
    const listener = () => {
      const next = readPath();
      setPath(next);
      if (next !== '/mapa') setBooting(false);
    };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => { setMobileMenuOpen(false); }, [path]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    sidebar.current?.querySelector<HTMLAnchorElement>('nav a')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileMenuOpen(false); menuButton.current?.focus(); }
    };
    const media = window.matchMedia(MOBILE_MAP_QUERY);
    const resize = () => { if (!media.matches) setMobileMenuOpen(false); };
    window.addEventListener('keydown', close);
    media.addEventListener('change', resize);
    return () => { window.removeEventListener('keydown', close); media.removeEventListener('change', resize); };
  }, [mobileMenuOpen]);
  function navigate(next: string) {
    if (next !== '/mapa') setBooting(false);
    window.location.hash = next;
    setPath(next);
    window.scrollTo({ top: 0 });
  }
  function enter() {
    try { window.sessionStorage.setItem(DEMO_SESSION, 'active'); } catch { /* Session can stay in memory. */ }
    setMapReady(false);
    setRevealing(false);
    setBooting(true);
    setEntered(true);
    navigate('/mapa');
  }
  function leave() {
    try { window.sessionStorage.removeItem(DEMO_SESSION); } catch { /* No credentials are persisted. */ }
    setEntered(false);
    setBooting(false);
    setRole('admin');
    setTeamId('mecanica');
    navigate('/mapa');
  }
  if (!entered) return <LoginPage onEnter={enter} />;
  const areaRoute = /^\/areas\/([^/]+)(?:\/equipamentos\/([^/]+))?$/.exec(path);
  const section = areaRoute ? 'areas' : path.slice(1);
  const titles: Record<string, string> = { mapa: 'Mapa da operação', areas: 'Áreas da planta', equipes: 'Equipes', equipamentos: 'Equipamentos', cadastros: 'Cadastros', indicadores: 'Indicadores de manutenção' };
  return <><div className={`workspace ${path === '/mapa' ? 'workspace-map' : ''}`} inert={booting}>
    <button ref={menuButton} className="workspace-mobile-menu" type="button" aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'} aria-expanded={mobileMenuOpen} aria-controls="workspace-navigation" onClick={() => setMobileMenuOpen(open => !open)}><Icon name="menu" /></button>
    {mobileMenuOpen && <button className="workspace-menu-backdrop" type="button" aria-label="Fechar menu" tabIndex={-1} onClick={() => { setMobileMenuOpen(false); menuButton.current?.focus(); }} />}
    <aside ref={sidebar} id="workspace-navigation" className={`workspace-sidebar ${mobileMenuOpen ? 'workspace-sidebar-open' : ''}`} onClick={event => { if ((event.target as Element).closest('a, button')) setMobileMenuOpen(false); }}>
      <a href="#/mapa" className="workspace-brand" aria-label="CampoLivre, mapa"><Icon name="layers" /></a>
      <nav aria-label="Navegação principal">
        <a href="#/mapa" aria-current={section === 'mapa' ? 'page' : undefined}><Icon name="map" /><span>Mapa</span></a>
        <a href="#/areas" aria-current={section === 'areas' ? 'page' : undefined}><Icon name="layers" /><span>Áreas</span></a>
        <a href="#/equipes" aria-current={section === 'equipes' ? 'page' : undefined}><Icon name="people" /><span>Equipes</span></a>
        <a href="#/equipamentos" aria-current={section === 'equipamentos' ? 'page' : undefined}><Icon name="equipment" /><span>Ativos</span></a>
        {role !== 'technician' && <a href="#/indicadores" aria-current={section === 'indicadores' ? 'page' : undefined}><Icon name="chart" /><span>Indicadores</span></a>}
        {role === 'admin' && <a href="#/cadastros" aria-current={section === 'cadastros' ? 'page' : undefined}><Icon name="settings" /><span>Cadastros</span></a>}
      </nav>
      <div className="workspace-sidebar-bottom"><span className="workspace-community-mark">IH</span><button type="button" onClick={leave} aria-label="Sair da demonstração"><Icon name="logout" /><span>Sair</span></button></div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-topbar">
        <div><a href="#/mapa" className="workspace-wordmark" aria-label="In-Haus, CampoLivre"><img src="/images/brand/inhaus-logo.png" alt="In-Haus industrial" /><span className="workspace-product">campo<strong>livre</strong><b>.</b></span></a><span className="workspace-breadcrumb">/</span><span className="workspace-section-title">{titles[section] ?? 'CampoLivre'}</span></div>
        <div className="workspace-account"><span className="workspace-demo-badge"><i />DEMONSTRAÇÃO</span><label className="workspace-role"><span>Simular perfil</span><select aria-label="Simular perfil" value={role} onChange={event => { const next = event.target.value; if (next === 'admin' || next === 'supervisor' || next === 'leader' || next === 'technician') setRole(next); }}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span className="workspace-avatar" aria-hidden="true">{{ admin: 'AD', supervisor: 'SV', leader: 'LD', technician: 'TC' }[role]}</span></div>
      </header>
      {(role === 'supervisor' || role === 'leader') && section !== 'indicadores' && <label className="workspace-team-scope"><span>Equipe de referência</span><select aria-label="Equipe de referência" value={teamId} onChange={event => setTeamId(event.target.value)}>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
      <main className="workspace-content" id="conteudo"><Suspense fallback={<p className="workspace-empty" role="status">Abrindo seu espaço…</p>}>
        {path === '/mapa' ? <MapHub key={`${role}:${teamId}`} access={access} onNavigate={navigate} onReady={handleMapReady} reveal={revealing || !booting} /> : areaRoute ? <OperationsPage areaId={areaRoute[1]} equipmentId={areaRoute[2]} role={role} teamId={teamId} onNavigate={navigate} /> : section === 'equipes' ? <TeamsPage key={`${role}:${teamId}`} access={access} onNavigate={navigate} /> : section === 'cadastros' ? <AdminPage key={role} role={role} onNavigate={navigate} /> : section === 'indicadores' ? <IndicatorsPage role={role} /> : ['areas', 'equipamentos'].includes(section) ? <Directory key={section} kind={section} onNavigate={navigate} /> : <div className="workspace-empty"><h1>Página não encontrada</h1><p>Volte ao mapa para explorar as áreas.</p><button type="button" onClick={() => navigate('/mapa')}>Voltar ao mapa</button></div>}
      </Suspense></main>
    </div>
  </div>{booting && <PowerOn ready={mapReady} onReveal={revealMap} onComplete={finishBoot} />}</>;
}
