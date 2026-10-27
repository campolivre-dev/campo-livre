import { useId, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import { MAX_ARRIVAL_PHOTO_BYTES, MAX_ARRIVAL_STEPS, validateArrivalGuide } from './arrivalGuideModel';
import type { ArrivalGuide, ArrivalStep } from './arrivalGuideModel';
import type { AccessContext } from './workspaceModel';
import { useWorkspaceData } from './useWorkspaceData';
import './arrival-guide.css';

const blankStep = (): ArrivalStep => ({ id: crypto.randomUUID(), title: '', instruction: '', photo: '' });

async function preparePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Escolha uma foto JPG, PNG ou WebP de até 10 MB.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Não foi possível abrir esta foto. Escolha outro arquivo JPG, PNG ou WebP.'); });
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a foto.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [.82, .65, .45]) {
      const photo = canvas.toDataURL('image/jpeg', quality);
      if (photo.length <= Math.ceil(MAX_ARRIVAL_PHOTO_BYTES / 3) * 4 + 23) return photo;
    }
    throw new Error('A foto tem muitos detalhes. Escolha uma imagem menor ou recorte antes de enviar.');
  } finally { bitmap.close(); }
}

function GuideSteps({ guide, onPhoto }: { guide: ArrivalGuide; onPhoto: (step: ArrivalStep) => void }) {
  return <div className="arrival-path">
    <div className="arrival-start"><Icon name="pin" /><div><span>Comece por aqui</span><strong>{guide.startingPoint}</strong></div></div>
    <ol className="arrival-steps">{guide.steps.map((step, index) => <li key={step.id}>
      <div className="arrival-step-copy"><span className="arrival-step-number">{index + 1}</span><div><h3>{step.title}</h3><p>{step.instruction}</p></div></div>
      <button className="arrival-photo" type="button" aria-label={`Ampliar foto da etapa ${index + 1}: ${step.title}`} onClick={() => onPhoto(step)}><img src={step.photo} alt={`Referência da etapa ${index + 1}: ${step.title}`} loading="lazy" /><span><Icon name="expand" /> Ampliar foto</span></button>
    </li>)}</ol>
    <div className="arrival-destination"><Icon name="check" /><div><strong>Você chegou quando…</strong><p>{guide.destination}</p></div></div>
  </div>;
}

export function ArrivalGuidePanel({ areaId, equipmentId, name, active, access }: { areaId: string; equipmentId?: string; name: string; active: boolean; access: AccessContext }) {
  const workspace = useWorkspaceData(access);
  const area = workspace.areas.find(item => item.id === areaId);
  const guide = equipmentId ? workspace.equipment.find(item => item.id === equipmentId)?.arrivalGuide : area?.arrivalGuide;
  const canEdit = active && (access.role === 'admin' || access.role === 'supervisor' && workspace.teams.some(team => team.id === access.teamId && team.areaId === areaId));
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState(false);
  const [photo, setPhoto] = useState<ArrivalStep | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const showPhoto = (step: ArrivalStep) => { setPhoto(step); dialog.current?.showModal(); };
  return <section className="arrival-guide" aria-labelledby={`${id}-title`}>
    <header className="arrival-heading"><span className="arrival-icon"><Icon name="pin" /></span><div><p className="op-eyebrow">LOCALIZAÇÃO E REFERÊNCIAS</p><h2 id={`${id}-title`}>Como chegar</h2><p>{equipmentId ? 'Do acesso da área até este equipamento.' : `Encontre ${name} com orientações e fotos do caminho.`}</p></div>{canEdit && !editing && <button className="op-button op-button-light" type="button" onClick={() => { setEditing(true); setNotice(''); setRemoving(false); }}>{guide ? 'Editar caminho' : 'Adicionar orientações'}</button>}</header>
    {equipmentId && <div className="arrival-parent"><a href={`#/areas/${areaId}`}>Ver localização da área: {area?.name} ↗</a>{area?.arrivalGuide && <details><summary>Caminho até a área {area.name}</summary><GuideSteps guide={area.arrivalGuide} onPhoto={showPhoto} /></details>}</div>}
    {!editing && (guide ? <>
      <button className="arrival-open" type="button" aria-expanded={viewing} aria-controls={`${id}-path`} onClick={() => setViewing(!viewing)}><div><strong>{guide.startingPoint}</strong><span>{guide.steps.length} {guide.steps.length === 1 ? 'etapa com foto' : 'etapas com fotos'}</span></div><span>{viewing ? 'Recolher caminho −' : 'Ver caminho →'}</span></button>
      <div id={`${id}-path`} hidden={!viewing}><GuideSteps guide={guide} onPhoto={showPhoto} /></div>
    </> : <p className="arrival-empty">Ainda não há fotos ou orientações cadastradas para este local.{canEdit ? ' Adicione um ponto de partida e as referências do caminho.' : ' Peça ao administrador ou ao supervisor responsável para cadastrar o caminho.'}</p>)}
    {editing && <ArrivalGuideForm initial={guide} onCancel={() => setEditing(false)} onSave={draft => {
      const result = workspace.setArrivalGuide(equipmentId ? 'equipment' : 'area', equipmentId ?? areaId, draft);
      if (result.ok) { setEditing(false); setViewing(true); setNotice('Orientações atualizadas.'); }
      return result;
    }} />}
    {canEdit && guide && !editing && <div className="arrival-remove">{removing ? <><span>Remover este caminho e suas fotos?</span><button type="button" onClick={() => { const result = workspace.setArrivalGuide(equipmentId ? 'equipment' : 'area', equipmentId ?? areaId, null); setNotice(result.ok ? 'Orientações removidas.' : result.message); setRemoving(false); }}>Confirmar remoção</button><button type="button" onClick={() => setRemoving(false)}>Cancelar</button></> : <button type="button" onClick={() => setRemoving(true)}>Remover orientações</button>}</div>}
    {notice && <p className="op-success" role="status">{notice}</p>}
    {workspace.storageWarning && <p className="op-storage-warning" role="alert">{workspace.storageWarning}</p>}
    <p className="arrival-local-note">Nesta demonstração, fotos e orientações ficam apenas neste navegador e não são compartilhadas com outros dispositivos.</p>
    <dialog className="arrival-photo-dialog" ref={dialog} aria-labelledby={`${id}-photo-title`} onClose={() => setPhoto(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div><header><h2 id={`${id}-photo-title`}>{photo?.title}</h2><button type="button" aria-label="Fechar foto" onClick={() => dialog.current?.close()}>×</button></header>{photo && <><img src={photo.photo} alt={photo.title} /><p>{photo.instruction}</p></>}</div></dialog>
  </section>;
}

function ArrivalGuideForm({ initial, onSave, onCancel }: { initial?: ArrivalGuide; onSave: (guide: ArrivalGuide) => { ok: boolean; message: string }; onCancel: () => void }) {
  const [startingPoint, setStartingPoint] = useState(initial?.startingPoint ?? '');
  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [steps, setSteps] = useState<ArrivalStep[]>(() => initial?.steps.map(step => ({ ...step })) ?? [blankStep()]);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const id = useId();
  function update(stepId: string, patch: Partial<ArrivalStep>) { setSteps(previous => previous.map(step => step.id === stepId ? { ...step, ...patch } : step)); }
  function move(index: number, delta: number) {
    setSteps(previous => { const next = [...previous]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next; });
  }
  async function addPhoto(event: ChangeEvent<HTMLInputElement>, stepId: string) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    if (!file) return;
    setReading(true); setError('');
    try { update(stepId, { photo: await preparePhoto(file) }); }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível abrir esta foto.'); }
    finally { setReading(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault(); if (reading) return;
    try {
      const answer = onSave(validateArrivalGuide({ startingPoint, destination, steps }));
      if (!answer.ok) setError(answer.message);
    } catch (error) { setError(error instanceof Error ? error.message : 'Confira as orientações.'); }
  }
  return <form className="arrival-form" aria-label="Editar orientações de chegada" onSubmit={submit}>
    <label htmlFor={`${id}-start`}>Ponto de partida</label><input id={`${id}-start`} value={startingPoint} onChange={event => setStartingPoint(event.target.value)} required maxLength={250} placeholder="Ex.: recepção do setor, junto à placa de identificação" />
    <p className="arrival-field-hint">Use uma referência conhecida e descreva o caminho na ordem em que a pessoa deve seguir.</p>
    <div className="arrival-editor-steps">{steps.map((step, index) => <fieldset key={step.id}><legend>Etapa {index + 1}</legend>
      <label htmlFor={`${id}-${step.id}-title`}>Título da etapa {index + 1}</label><input id={`${id}-${step.id}-title`} value={step.title} onChange={event => update(step.id, { title: event.target.value })} required maxLength={100} placeholder="Ex.: siga pela passagem sinalizada" />
      <label htmlFor={`${id}-${step.id}-instruction`}>Orientação da etapa {index + 1}</label><textarea id={`${id}-${step.id}-instruction`} value={step.instruction} onChange={event => update(step.id, { instruction: event.target.value })} required maxLength={1000} rows={2} placeholder="Descreva a referência visível e o que fazer neste ponto." />
      {step.photo && <img className="arrival-photo-preview" src={step.photo} alt={`Foto selecionada para a etapa ${index + 1}`} />}
      <label htmlFor={`${id}-${step.id}-photo`}>Foto da etapa {index + 1}</label><input className="op-file-input" id={`${id}-${step.id}-photo`} type="file" accept="image/jpeg,image/png,image/webp" disabled={reading} onChange={event => { void addPhoto(event, step.id); }} />
      <div className="arrival-step-actions"><button type="button" disabled={reading || index === 0} onClick={() => move(index, -1)} aria-label={`Mover etapa ${index + 1} para cima`}>↑ Subir</button><button type="button" disabled={reading || index === steps.length - 1} onClick={() => move(index, 1)} aria-label={`Mover etapa ${index + 1} para baixo`}>↓ Descer</button><button type="button" disabled={reading || steps.length === 1} onClick={() => setSteps(previous => previous.filter(item => item.id !== step.id))} aria-label={`Remover etapa ${index + 1}`}>Remover etapa</button></div>
    </fieldset>)}</div>
    <button className="op-button op-button-light" type="button" disabled={reading || steps.length >= MAX_ARRIVAL_STEPS} onClick={() => setSteps(previous => [...previous, blankStep()])}>+ Adicionar etapa</button><p className="arrival-field-hint">Até {MAX_ARRIVAL_STEPS} etapas. Fotos JPG, PNG ou WebP de até 10 MB são reduzidas antes de salvar.</p>
    <label htmlFor={`${id}-destination`}>Como reconhecer o destino</label><textarea id={`${id}-destination`} value={destination} onChange={event => setDestination(event.target.value)} required maxLength={500} rows={2} placeholder="Ex.: porta identificada com o nome da área e a placa do equipamento" />
    {error && <p className="op-error" role="alert">{error}</p>}
    <div className="op-form-actions"><button type="submit" className="op-button op-button-primary" disabled={reading}>{reading ? 'Preparando foto…' : 'Salvar orientações'}</button><button type="button" className="op-button op-button-text" disabled={reading} onClick={onCancel}>Cancelar</button></div>
  </form>;
}
