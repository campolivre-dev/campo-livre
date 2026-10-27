export interface ArrivalStep { id: string; title: string; instruction: string; photo: string }
export interface ArrivalGuide { startingPoint: string; destination: string; steps: ArrivalStep[] }
export const MAX_ARRIVAL_STEPS = 6;
export const MAX_ARRIVAL_PHOTO_BYTES = 200 * 1024;

export function validateArrivalGuide(value: unknown): ArrivalGuide {
  if (!value || typeof value !== 'object') throw new Error('Informe as orientações de chegada.');
  const guide = value as ArrivalGuide;
  const text = (input: unknown, label: string, max: number) => {
    if (typeof input !== 'string' || !input.trim() || input.trim().length > max) throw new Error(`Informe ${label} (até ${max} caracteres).`);
    return input.trim();
  };
  if (!Array.isArray(guide.steps) || !guide.steps.length || guide.steps.length > MAX_ARRIVAL_STEPS) throw new Error(`Adicione de 1 a ${MAX_ARRIVAL_STEPS} etapas com fotos.`);
  const ids = new Set<string>();
  return {
    startingPoint: text(guide.startingPoint, 'o ponto de partida', 250),
    destination: text(guide.destination, 'como reconhecer o destino', 500),
    steps: guide.steps.map(step => {
      if (!step || typeof step !== 'object') throw new Error('Etapa inválida.');
      const id = text(step.id, 'um identificador da etapa', 100);
      if (ids.has(id)) throw new Error('Etapa duplicada.');
      ids.add(id);
      if (typeof step.photo !== 'string' || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(step.photo) || step.photo.length > Math.ceil(MAX_ARRIVAL_PHOTO_BYTES / 3) * 4 + 40) throw new Error('Adicione uma foto JPG, PNG ou WebP de até 200 KB em cada etapa.');
      return { id, title: text(step.title, 'o título de cada etapa', 100), instruction: text(step.instruction, 'a orientação de cada etapa', 1000), photo: step.photo };
    }),
  };
}
