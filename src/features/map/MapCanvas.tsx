import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Area } from '../operations/data';
import type { MapMarker } from '../operations/workspaceModel';
import { Icon } from '../../components/Icon';
import { MAP_WIDTH, MAP_HEIGHT, mapLayers } from './mapImagery';
import type { MapScene, MapView } from './mapScene';
import { MOBILE_MAP_QUERY } from './mobileMap';

const overview = mapLayers.find(layer => layer.id === 'overview')!;
const pickingBounds = {
  left: (overview.crop.x * overview.transform.scaleX + overview.transform.offsetX) / MAP_WIDTH,
  right: ((overview.crop.x + overview.crop.width) * overview.transform.scaleX + overview.transform.offsetX) / MAP_WIDTH,
  top: (overview.crop.y * overview.transform.scaleY + overview.transform.offsetY) / MAP_HEIGHT,
  bottom: ((overview.crop.y + overview.crop.height) * overview.transform.scaleY + overview.transform.offsetY) / MAP_HEIGHT,
};

export function MapCanvas({ areas, markers, focusId, focusRevision, onMarkerClick, onReady, reveal = true, picking = false, onPickPosition, selectedMarkerId = null, draftPosition = null }: {
  areas: Area[];
  markers: MapMarker[];
  picking?: boolean;
  onPickPosition?: (position: [number, number]) => void;
  selectedMarkerId?: string | null;
  draftPosition?: [number, number] | null;
  focusId: string | null;
  focusRevision: number;
  onMarkerClick: (marker: MapMarker) => void;
  onReady?: () => void;
  reveal?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const pins = useRef<HTMLDivElement>(null);
  const scene = useRef<MapScene | null>(null);
  const readyNotified = useRef(false);
  const readyCallback = useRef(onReady);
  readyCallback.current = onReady;
  const latestAreas = useRef(areas);
  latestAreas.current = areas;
  const pointer = useRef<{ id: number; x: number; y: number; target: HTMLElement; dragged: boolean } | null>(null);
  const latestFocus = useRef(focusId);
  latestFocus.current = focusId;
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState(false);
  const [warning, setWarning] = useState('');
  const [view, setView] = useState<MapView>(() => window.matchMedia(MOBILE_MAP_QUERY).matches ? '2d' : '3d');
  const latestView = useRef(view);
  latestView.current = view;
  const [showTeams, setShowTeams] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let stopped = false;
    function showFallback(message: string) {
      if (cancelled) return;
      stopped = true;
      scene.current?.dispose();
      scene.current = null;
      setFallback(true);
      setLoading(false);
      setWarning(message);
    }
    void import('./mapScene').then(({ createMapScene }) => {
      if (cancelled || !host.current) return;
      try {
        scene.current = createMapScene(host.current, {
          project(project) {
            if (cancelled || stopped) return;
            pins.current?.querySelectorAll<HTMLElement>('[data-u]').forEach(pin => {
              const point = project([Number(pin.dataset.u), Number(pin.dataset.v)]);
              pin.style.left = `${point.x}px`;
              pin.style.top = `${point.y}px`;
              pin.style.visibility = point.visible ? 'visible' : 'hidden';
            });
          },
          loaded(failed) {
            if (cancelled || stopped) return;
            setLoading(false);
            if (failed === mapLayers.length) showFallback('Não foi possível carregar as imagens do mapa. Use a lista de áreas ao lado.');
            else if (failed) setWarning('Parte das imagens não carregou. A navegação pelas áreas continua disponível.');
          },
          lost() { showFallback('O modo 3D ficou indisponível. Use a vista geral ou a lista de áreas.'); },
        }, latestView.current);
        const area = latestAreas.current.find(item => item.id === latestFocus.current);
        if (area) scene.current.focus(area.position);
      } catch {
        showFallback('Este navegador não disponibilizou o modo 3D. Você pode abrir as áreas pela vista geral ou pela lista.');
      }
    }).catch(() => showFallback('Não foi possível abrir o modo 3D. Você pode explorar as áreas pela vista geral ou pela lista.'));
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MAP_QUERY);
    const update = () => {
      if (media.matches) { setView('2d'); scene.current?.setView('2d'); }
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const focusedArea = areas.find(item => item.id === focusId);
  const focusU = focusedArea?.position[0];
  const focusV = focusedArea?.position[1];
  useEffect(() => {
    if (focusU !== undefined && focusV !== undefined) scene.current?.focus([focusU, focusV]);
  }, [focusId, focusRevision, focusU, focusV]);

  useEffect(() => { scene.current?.refresh(); }, [markers, draftPosition, showTeams, fallback]);

  useEffect(() => {
    if (loading) return;
    if (!readyNotified.current) {
      readyNotified.current = true;
      readyCallback.current?.();
    }
    if (reveal && !fallback) scene.current?.reveal();
  }, [loading, fallback, reveal]);

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    pointer.current = null;
    if (!picking || loading || !event.isPrimary || event.button !== 0) { pointer.current = null; return; }
    const target = event.target;
    if (!(target instanceof HTMLElement) || !(target instanceof HTMLCanvasElement || target instanceof HTMLImageElement && target.classList.contains('map-fallback-image'))) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, target, dragged: false };
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) start.dragged = true;
  }
  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    pointer.current = null;
    if (!picking || !start || start.id !== event.pointerId || !event.isPrimary || event.button !== 0 || start.dragged || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const rect = start.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (!rect.width || !rect.height || x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    const position: [number, number] | null = fallback ? [Math.min(1, Math.max(0, x / rect.width)), Math.min(1, Math.max(0, y / rect.height))] : scene.current?.pick(x, y) ?? null;
    if (position && position[0] >= pickingBounds.left && position[0] <= pickingBounds.right && position[1] >= pickingBounds.top && position[1] <= pickingBounds.bottom) onPickPosition?.(position);
  }

  function changeView(next: MapView) { setView(next); scene.current?.setView(next); }

  return <div className={`map-viewport ${fallback ? 'map-fallback' : ''} ${picking ? 'map-picking' : ''}`} aria-busy={loading} onPointerDownCapture={pointerDown} onPointerMoveCapture={pointerMove} onPointerUpCapture={pointerUp} onPointerCancelCapture={() => { pointer.current = null; }}>
    <div className="map-renderer" ref={host} hidden={fallback} />
    {fallback && <img className="map-fallback-image" src={mapLayers[0].src} alt="Vista aérea de referência da CSN" />}
    <div className="map-scene-label"><span className="map-live-dot" /><div><strong>CSN · Volta Redonda</strong><span>Referência visual da planta</span></div></div>
    <div className="map-layer-controls" aria-label="Camadas do mapa">
      <button type="button" aria-pressed={showTeams} onClick={() => setShowTeams(!showTeams)}><Icon name="people" />Equipes</button>
    </div>
    {loading && !fallback && <div className="map-loading" role="status"><span className="map-spinner" />Preparando sua visão do campo…</div>}
    <div className="map-pins" ref={pins}>
      {markers.map((marker) => {
        const [u, v] = marker.position;
        const isArea = marker.kind === 'area';
        const active = selectedMarkerId === marker.id || isArea && focusId === marker.entityId;
        return <button type="button" key={marker.id} className={`${isArea ? 'map-pin' : 'map-team-pin'} ${active ? 'map-pin-active' : ''}`} hidden={!isArea && !showTeams} data-u={u} data-v={v} style={fallback ? { left: `${u * 100}%`, top: `${v * 100}%`, visibility: 'visible' } : undefined} aria-label={isArea ? `Abrir área ${marker.label}` : marker.label} title={isArea ? marker.label : `${marker.label} · Posição demonstrativa, sem rastreamento`} onClick={() => onMarkerClick(marker)}>
          {isArea ? <><span className="map-pin-number">{String(areas.findIndex(area => area.id === marker.entityId) + 1).padStart(2, '0')}</span><span className="map-pin-name">{marker.label}<Icon name="arrow" /></span><span className="map-pin-stem" /></> : <><Icon name="people" /><span>{marker.label}</span></>}
        </button>;
      })}
      {draftPosition && <div className="map-pin map-draft-pin" role="img" aria-label="Posição escolhida para o marcador" data-u={draftPosition[0]} data-v={draftPosition[1]} style={{ pointerEvents: 'none', ...(fallback ? { left: `${draftPosition[0] * 100}%`, top: `${draftPosition[1] * 100}%`, visibility: 'visible' as const } : {}) }}><span className="map-pin-number">+</span><span className="map-pin-name">Nova posição</span><span className="map-pin-stem" /></div>}
    </div>
    {warning && <p className="map-warning" role="status">{warning}</p>}
    <div className="map-bottom-controls">
      <div className="map-view-control" aria-label="Perspectiva do mapa"><button type="button" disabled={fallback || loading} aria-pressed={view === '2d'} onClick={() => changeView('2d')}>2D</button><button type="button" disabled={fallback || loading} aria-pressed={view === '3d'} onClick={() => changeView('3d')}>3D</button></div>
    </div>
    <div className="map-footnote"><span>Imagens: Google Earth · capturas fornecidas pelo usuário</span><span>Posições demonstrativas</span></div>
  </div>;
}
