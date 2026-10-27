import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import { useWorkspaceData } from '../operations/useWorkspaceData';
import type { AccessContext, MapMarker } from '../operations/workspaceModel';
import './map-editor.css';

type Placement = 'area' | 'team' | 'move' | null;
interface MapEditorProps {
  access: AccessContext;
  selectedMarker: MapMarker | null;
  placement: Placement;
  draftPosition: [number, number] | null;
  onPlacementChange: (kind: Placement) => void;
  onClearSelection: () => void;
  onSelectMarker: (id: string) => void;
  onClose: () => void;
}

export function MapEditor({ access, selectedMarker: selection, placement, draftPosition, onPlacementChange, onClearSelection, onSelectMarker, onClose }: MapEditorProps) {
  const workspace = useWorkspaceData(access);
  const canManage = (marker: MapMarker) => access.role === 'admin' || (access.role === 'supervisor' && marker.kind === 'team' && marker.entityId === access.teamId);
  const selectedMarker = selection && canManage(selection) ? selection : null;
  const markers = workspace.markers.filter(canManage);
  const hiddenMarkers = workspace.hiddenMarkers.filter(canManage);
  const [name, setName] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [areaId, setAreaId] = useState('');
  const [members, setMembers] = useState('');
  const [image, setImage] = useState('/images/teams/silverio.png');
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const id = useId();
  const firstInput = useRef<HTMLInputElement>(null);
  const confirmMove = useRef<HTMLButtonElement>(null);
  const picking = placement !== null && draftPosition === null;

  useEffect(() => { setRemoving(false); }, [selectedMarker?.id]);
  useEffect(() => {
    if (draftPosition && placement) {
      if (placement === 'move') confirmMove.current?.focus();
      else firstInput.current?.focus();
    }
  }, [draftPosition, placement]);

  function cancel() { onPlacementChange(null); setRemoving(false); }
  function begin(kind: Exclude<Placement, null>) {
    setNotice(null); setRemoving(false);
    if (kind !== 'move') {
      onClearSelection(); setName(''); setSupervisor(''); setAreaId(''); setMembers(''); setImage('/images/teams/silverio.png');
    }
    onPlacementChange(kind);
  }
  function finish(result: { ok: boolean; message: string }) {
    setNotice(result);
    if (result.ok) { cancel(); onClearSelection(); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftPosition || !placement) return;
    if (placement === 'move') {
      if (selectedMarker) finish(workspace.moveMarker(selectedMarker.id, draftPosition));
    } else if (placement === 'area') finish(workspace.addArea({ name, position: draftPosition }));
    else finish(workspace.addTeam({ name, supervisor, areaId, position: draftPosition, image, members: members.split(/[,\n]/).map(member => member.trim()).filter(Boolean) }));
  }

  return <aside className={`map-editor ${picking ? 'map-editor-picking' : ''}`} aria-label="Editar mapa">
    <header className="map-editor-header"><div><p>SEU MAPA, DO SEU JEITO</p><h2>Editar mapa</h2></div><button type="button" className="map-editor-close" aria-label="Fechar edição do mapa" onClick={() => { cancel(); onClearSelection(); onClose(); }}>×</button></header>
    {workspace.storageWarning && <p className="map-editor-message map-editor-error" role="alert">{workspace.storageWarning}</p>}
    {notice && <p className={`map-editor-message ${notice.ok ? '' : 'map-editor-error'}`} role={notice.ok ? 'status' : 'alert'}>{notice.message}</p>}
    {picking ? <div className="map-editor-pick"><Icon name="pin" /><p>Clique no mapa para escolher {placement === 'move' ? 'a nova posição' : 'a posição'}{placement === 'move' && selectedMarker ? ` de ${selectedMarker.label}` : placement === 'area' ? ' do setor' : ' da equipe'}.</p><button type="button" className="map-editor-secondary" onClick={cancel}>Cancelar</button></div> : placement && draftPosition ? <form onSubmit={save} className="map-editor-form">
      <h3>{placement === 'area' ? 'Novo setor' : placement === 'team' ? 'Nova equipe' : `Mover ${selectedMarker?.label ?? 'marcador'}`}</h3>
      <p className="map-editor-position"><Icon name="check" /> Posição escolhida no mapa</p>
      <button type="button" className="map-editor-text" onClick={() => onPlacementChange(placement)}>Escolher outra posição</button>
      {placement !== 'move' && <><label htmlFor={`${id}-name`}>{placement === 'area' ? 'Nome do setor' : 'Nome da equipe'}</label><input ref={firstInput} id={`${id}-name`} required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder={placement === 'area' ? 'Ex.: Pátio de manutenção' : 'Ex.: Equipe de refrigeração'} /></>}
      {placement === 'team' && <><label htmlFor={`${id}-supervisor`}>Supervisor</label><input id={`${id}-supervisor`} required maxLength={100} value={supervisor} onChange={event => setSupervisor(event.target.value)} placeholder="Nome do supervisor" /><label htmlFor={`${id}-area`}>Setor designado</label><select id={`${id}-area`} required value={areaId} onChange={event => setAreaId(event.target.value)}><option value="" disabled>Selecione um setor</option>{workspace.areas.filter(area => area.active).map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select><p className="map-editor-hint">Responsabilidade da equipe. O marcador pode ficar em outro ponto do mapa.</p><label htmlFor={`${id}-members`}>Colaboradores <span>(opcional)</span></label><textarea id={`${id}-members`} rows={2} maxLength={2000} value={members} onChange={event => setMembers(event.target.value)} placeholder="Separe os nomes por vírgula ou por linha" /><label htmlFor={`${id}-image`}>Imagem da equipe</label><select id={`${id}-image`} value={image} onChange={event => setImage(event.target.value)}><option value="/images/teams/silverio.png">Climatização · splits e janela</option><option value="/images/teams/yuri.png">Climatização · chiller e dutos</option><option value="/images/teams/claudio.png">Equipe industrial</option></select></>}
      <div className="map-editor-actions"><button ref={confirmMove} type="submit" className="map-editor-primary">{placement === 'move' ? 'Confirmar posição' : placement === 'area' ? 'Adicionar setor' : 'Adicionar equipe'}</button><button type="button" className="map-editor-secondary" onClick={cancel}>Cancelar</button></div>
    </form> : <>
      <p className="map-editor-intro">{access.role === 'admin' ? 'Adicione setores e equipes ou selecione um marcador para ajustar o mapa.' : 'Ajuste o marcador da sua equipe. A designação da área pode ser alterada na tela Equipes.'}</p>
      {access.role === 'admin' && <div className="map-editor-add"><button type="button" className="map-editor-primary" onClick={() => begin('area')}><Icon name="layers" />Adicionar setor</button><button type="button" className="map-editor-secondary" onClick={() => begin('team')}><Icon name="people" />Adicionar equipe</button></div>}
      {selectedMarker && <section className="map-editor-selection"><p>MARCADOR SELECIONADO</p><h3>{selectedMarker.label}</h3>{removing ? <><p className="map-editor-removal-copy">Remover {selectedMarker.label} do mapa? O cadastro e o histórico de manutenção serão preservados.</p><div className="map-editor-actions"><button type="button" className="map-editor-remove" onClick={() => finish(workspace.hideMarker(selectedMarker.id))}>Remover do mapa</button><button type="button" className="map-editor-secondary" onClick={() => setRemoving(false)}>Cancelar</button></div></> : <div className="map-editor-actions"><button type="button" className="map-editor-secondary" onClick={() => begin('move')}><Icon name="pin" />Mover marcador</button><button type="button" className="map-editor-text map-editor-remove-text" onClick={() => setRemoving(true)}>Remover do mapa</button></div>}</section>}
      <section className="map-editor-list"><h3>Marcadores no mapa <span>{markers.length}</span></h3>{markers.map(marker => <button type="button" key={marker.id} aria-pressed={selectedMarker?.id === marker.id} onClick={() => { setNotice(null); onSelectMarker(marker.id); }}><Icon name={marker.kind === 'area' ? 'layers' : 'people'} /><span>{marker.label}<small>{marker.kind === 'area' ? 'Setor' : 'Equipe'}</small></span><Icon name="pin" /></button>)}</section>
      {hiddenMarkers.length > 0 && <details className="map-editor-hidden"><summary>Removidos do mapa ({hiddenMarkers.length})</summary><p>Restaure um marcador na posição anterior.</p>{hiddenMarkers.map(marker => <div key={marker.id}><span>{marker.label}</span><button type="button" className="map-editor-text" aria-label={`Restaurar ${marker.label} no mapa`} onClick={() => finish(workspace.restoreMarker(marker.id))}>Restaurar</button></div>)}</details>}
      <p className="map-editor-hint">Alterações salvas neste navegador. Os marcadores não representam rastreamento em tempo real.</p>
    </>}
  </aside>;
}
