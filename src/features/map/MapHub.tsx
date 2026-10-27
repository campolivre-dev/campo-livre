import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { useOperations } from '../operations/useOperations';
import { useWorkspaceData } from '../operations/useWorkspaceData';
import type { AccessContext, MapMarker, MapPosition } from '../operations/workspaceModel';
import { MapCanvas } from './MapCanvas';
import { MapEditor } from './MapEditor';
import { MOBILE_MAP_QUERY } from './mobileMap';

interface MapHubProps {
  access: AccessContext;
  onNavigate: (path: string) => void;
  onReady: () => void;
  reveal: boolean;
}

export function MapHub({ access, onNavigate, onReady, reveal }: MapHubProps) {
  const { areas, teams, equipment, markers, storageWarning } = useWorkspaceData(access);
  const canEdit = access.role === 'admin' || access.role === 'supervisor';
  const [query, setQuery] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusRevision, setFocusRevision] = useState(0);
  const [exploring, setExploring] = useState(() => window.matchMedia('(min-width: 1100px)').matches);
  const [editing, setEditing] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [placement, setPlacement] = useState<'area' | 'team' | 'move' | null>(null);
  const [draftPosition, setDraftPosition] = useState<MapPosition | null>(null);
  const { summary } = useOperations();
  const visibleAreaIds = new Set(markers.filter(marker => marker.kind === 'area').map(marker => marker.entityId));
  const filteredAreas = areas.filter(area => visibleAreaIds.has(area.id) && area.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const selectedMarker = markers.find(marker => marker.id === selectedMarkerId) ?? null;

  function changePlacement(next: 'area' | 'team' | 'move' | null) {
    setPlacement(next);
    setDraftPosition(null);
  }

  function selectMarker(id: string) {
    setSelectedMarkerId(id);
    changePlacement(null);
  }

  function closeEditor() {
    setEditing(false);
    setSelectedMarkerId(null);
    changePlacement(null);
  }

  function openMarker(marker: MapMarker) {
    if (editing) { selectMarker(marker.id); return; }
    const areaId = marker.kind === 'area' ? marker.entityId : teams.find(team => team.id === marker.entityId)?.areaId;
    if (areaId) onNavigate(`/areas/${areaId}`);
  }

  function focusArea(id: string) {
    setFocusId(id);
    setFocusRevision(value => value + 1);
    if (window.matchMedia(MOBILE_MAP_QUERY).matches) setExploring(false);
  }

  return <div className={`map-hub ${editing ? 'map-hub-editing' : ''}`}>
    <section className="hub-map-section" aria-label="Mapa interativo da empresa">
      <MapCanvas areas={areas} markers={markers} focusId={focusId} focusRevision={focusRevision} onMarkerClick={openMarker} onReady={onReady} reveal={reveal} picking={placement !== null} onPickPosition={setDraftPosition} selectedMarkerId={selectedMarkerId} draftPosition={draftPosition} />
    </section>
    <div className="hub-overview-heading">
      <div className="workspace-eyebrow"><span /> IN-HAUS · INTELIGÊNCIA EM CAMPO</div>
      <h1>Visão da operação<span>.</span></h1>
      <p>Uma planta inteira. Todos os caminhos conectados.</p>
    </div>
    {canEdit && <button className={`map-edit-toggle ${editing ? 'map-edit-toggle-active' : ''}`} type="button" aria-pressed={editing} onClick={() => { if (editing) closeEditor(); else setEditing(true); }}><Icon name="pin" />{editing ? 'Concluir edição' : 'Editar mapa'}</button>}
    {editing && canEdit && <MapEditor access={access} selectedMarker={selectedMarker} placement={placement} draftPosition={draftPosition} onPlacementChange={changePlacement} onClearSelection={() => { setSelectedMarkerId(null); changePlacement(null); }} onClose={closeEditor} onSelectMarker={selectMarker} />}
    {storageWarning && !editing && <p className="map-storage-warning" role="alert">{storageWarning}</p>}
    <div className="hub-metrics" aria-label="Resumo da operação">
      <a href="#/areas"><span className="hub-metric-icon"><Icon name="map" /></span><div><strong>{String(visibleAreaIds.size).padStart(2, '0')}</strong><span>Áreas no mapa</span></div></a>
      <a href="#/equipamentos"><span className="hub-metric-icon"><Icon name="equipment" /></span><div><strong>{String(equipment.filter(asset => asset.active && areas.some(area => area.id === asset.areaId && area.active)).length).padStart(2, '0')}</strong><span>Equipamentos ativos</span></div></a>
      <a href="#/equipes"><span className="hub-metric-icon"><Icon name="people" /></span><div><strong>{String(teams.length).padStart(2, '0')}</strong><span>Equipes designadas</span></div></a>
      <div><span className="hub-metric-icon"><Icon name="clock" /></span><div><strong>{String(summary.pendingApproval).padStart(2, '0')}</strong><span>Aguardando aprovação</span></div></div>
    </div>
    {!editing && <aside className={`hub-explorer ${exploring ? 'hub-explorer-expanded' : ''}`} aria-label="Explorar áreas">
      <button className="hub-explorer-toggle" type="button" aria-label="Explore a planta" aria-expanded={exploring} aria-controls="hub-explorer-content" onClick={() => setExploring(!exploring)}>
        <span className="hub-explorer-toggle-icon"><Icon name="layers" /></span><span>Explore a planta<small>{visibleAreaIds.size} áreas no mapa</small></span><span className="hub-explorer-toggle-sign" aria-hidden="true">{exploring ? '−' : '+'}</span>
      </button>
      <div className="hub-explorer-content" id="hub-explorer-content" hidden={!exploring}>
        <label className="hub-search"><Icon name="search" /><input type="search" aria-label="Buscar área" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar uma área…" /></label>
        <div className="hub-area-list">
          {filteredAreas.map(area => <article className={`hub-area ${focusId === area.id ? 'hub-area-selected' : ''}`} key={area.id}>
            <button className="hub-area-focus" type="button" aria-label={`Localizar ${area.name} no mapa`} aria-pressed={focusId === area.id} onClick={() => focusArea(area.id)}><span className="hub-area-index">0{areas.indexOf(area) + 1}</span><span><strong>{area.name}</strong><small>{area.equipmentIds.length} equipamentos · {area.teamIds.length} equipe</small></span><Icon name="pin" /></button>
            <button type="button" className="hub-area-open" onClick={() => onNavigate(`/areas/${area.id}`)}>Abrir área<Icon name="arrow" /></button>
          </article>)}
          {filteredAreas.length === 0 && <p className="workspace-empty">Nenhuma área encontrada. Tente outro nome.</p>}
        </div>
        <a className="hub-equipment-link" href="#/equipamentos"><Icon name="history" /><span>Histórico dos equipamentos</span><Icon name="arrow" /></a>
        <p className="hub-explorer-note">Áreas e posições demonstrativas.<br />A designação das equipes indica responsabilidade.</p>
      </div>
    </aside>}
    <div className="map-instructions"><Icon name="mouse" /><span>Arraste para mover<span className="map-desktop-instruction"> · Role para ampliar · Botão direito para girar</span></span></div>
  </div>;
}
