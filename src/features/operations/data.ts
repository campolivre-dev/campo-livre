import type { ArrivalGuide } from './arrivalGuideModel';
export type DemoRole = 'admin' | 'supervisor' | 'leader' | 'technician';
export const roleLabels: Record<DemoRole, string> = { admin: 'Administrador', supervisor: 'Supervisor', leader: 'Líder', technician: 'Técnico / Auxiliar' };
export const jobTitles = ['Eletromecânico 1', 'Eletromecânico 2', 'Eletromecânico 3', 'Auxiliar de Manutenção', 'Técnico', 'Líder', 'Supervisor'] as const;
export type JobTitle = typeof jobTitles[number];
export interface Collaborator { id: string; name: string; jobTitle: JobTitle; teamId: string | null; accessRole: DemoRole; active: boolean }


export interface Area {
  arrivalGuide?: ArrivalGuide;
  active: boolean;
  id: string;
  name: string;
  description: string;
  position: [number, number];
  equipmentIds: string[];
  teamIds: string[];
}

export const equipmentTypes = ['Split Hi-Wall', 'Split Inverter', 'Janela', 'Piso Teto', 'Fan Coil', 'Chiller', 'Dutado'] as const;
export type EquipmentType = typeof equipmentTypes[number];
export interface Equipment {
  arrivalGuide?: ArrivalGuide;
  active: boolean;
  id: string;
  areaId: string;
  name: string;
  tag: string;
  kind: string;
  location: string;
}

export interface Team {
  supervisorId?: string;
  id: string;
  name: string;
  areaId: string;
  members: string[];
  supervisor: string;
  image: string;
  imageAlt: string;
}

// Os nomes, limites, equipes, equipamentos e posições são exemplos fictícios.
// Nenhum destes pontos representa um cadastro operacional verificado da CSN.
export const areas: Area[] = [
  { id: 'oeste', active: true, name: 'Metalurgia', description: 'Visão demonstrativa da manutenção e dos equipamentos na região oeste.', position: [0.24, 0.41], equipmentIds: ['bomba-01', 'motor-01'], teamIds: ['mecanica'] },
  { id: 'norte', active: false, name: 'Pátio norte', description: 'Uma área de exemplo para acompanhar os ativos e o trabalho das equipes.', position: [0.44, 0.27], equipmentIds: ['transportador-01'], teamIds: ['mecanica'] },
  { id: 'central', active: true, name: 'Aços Longos', description: 'Histórico compartilhado para dar continuidade ao cuidado com cada equipamento.', position: [0.48, 0.55], equipmentIds: ['compressor-01', 'painel-01'], teamIds: ['eletrica'] },
  { id: 'leste', active: true, name: 'Obras', description: 'Consulte os equipamentos, as equipes designadas e os registros desta área de exemplo.', position: [0.76, 0.46], equipmentIds: ['ventilador-01'], teamIds: ['utilidades'] },
];

export const equipment: Equipment[] = [
  { id: 'split-hi-wall-01', active: true, areaId: 'oeste', name: 'Split Hi-Wall demonstrativo', tag: 'SHW-001', kind: 'Split Hi-Wall', location: 'Ponto demonstrativo · Metalurgia' },
  { id: 'split-inverter-01', active: true, areaId: 'oeste', name: 'Split Inverter demonstrativo', tag: 'SIV-001', kind: 'Split Inverter', location: 'Ponto demonstrativo · Metalurgia' },
  { id: 'janela-01', active: true, areaId: 'oeste', name: 'Janela demonstrativo', tag: 'JAN-001', kind: 'Janela', location: 'Ponto demonstrativo · Metalurgia' },
  { id: 'piso-teto-01', active: true, areaId: 'leste', name: 'Piso Teto demonstrativo', tag: 'PTE-001', kind: 'Piso Teto', location: 'Ponto demonstrativo · Obras' },
  { id: 'fan-coil-01', active: true, areaId: 'central', name: 'Fan Coil demonstrativo', tag: 'FCO-001', kind: 'Fan Coil', location: 'Ponto demonstrativo · Aços Longos' },
  { id: 'chiller-01', active: true, areaId: 'central', name: 'Chiller demonstrativo', tag: 'CHI-001', kind: 'Chiller', location: 'Ponto demonstrativo · Aços Longos' },
  { id: 'dutado-01', active: true, areaId: 'leste', name: 'Dutado demonstrativo', tag: 'DUT-001', kind: 'Dutado', location: 'Ponto demonstrativo · Obras' },
  { id: 'bomba-01', active: false, areaId: 'oeste', name: 'Bomba de circulação', tag: 'BMB-001', kind: 'Bomba centrífuga', location: 'Ponto demonstrativo 01 · Metalurgia' },
  { id: 'motor-01', active: false, areaId: 'oeste', name: 'Motor de acionamento', tag: 'MTR-002', kind: 'Motor elétrico', location: 'Ponto demonstrativo 02 · Metalurgia' },
  { id: 'transportador-01', active: false, areaId: 'norte', name: 'Transportador de materiais', tag: 'TRP-003', kind: 'Transportador', location: 'Ponto demonstrativo 03 · Pátio norte' },
  { id: 'compressor-01', active: false, areaId: 'central', name: 'Compressor de ar', tag: 'CMP-004', kind: 'Compressor', location: 'Ponto demonstrativo 04 · Aços Longos' },
  { id: 'painel-01', active: false, areaId: 'central', name: 'Painel de distribuição', tag: 'PNL-005', kind: 'Painel elétrico', location: 'Ponto demonstrativo 05 · Aços Longos' },
  { id: 'ventilador-01', active: false, areaId: 'leste', name: 'Ventilador industrial', tag: 'VNT-006', kind: 'Ventilador', location: 'Ponto demonstrativo 06 · Obras' },
];

export const teams: Team[] = [
  { id: 'mecanica', name: 'Equipe Silverio', supervisor: 'Silverio', areaId: 'oeste', image: '/images/teams/silverio.png', imageAlt: 'Ilustração de equipamentos de climatização split e de janela', members: ['Ana Martins', 'Lucas Ferreira', 'Rafael Costa', 'Marina Alves', 'Pedro Lima'] },
  { id: 'utilidades', name: 'Equipe Yuri', supervisor: 'Yuri', areaId: 'leste', image: '/images/teams/yuri.png', imageAlt: 'Ilustração de chiller e sistema de climatização com dutos', members: ['João Silva', 'Larissa Melo'] },
  { id: 'eletrica', name: 'Equipe Claudio', supervisor: 'Claudio', areaId: 'central', image: '/images/teams/claudio.png', imageAlt: 'Ilustração representativa da equipe de Claudio', members: ['Bruno Santos', 'Camila Rocha', 'Diego Souza'] },
];

export const demoActors: Record<DemoRole, string> = {
  admin: 'Administrador de demonstração',
  leader: 'Líder de demonstração',
  supervisor: 'Supervisor de demonstração',
  technician: 'Técnico de demonstração',
};

// IDs do responsável e dos integrantes são estáveis, inclusive na migração local.
export function collaboratorsForTeam(team: Team): Collaborator[] {
  return [
    ...team.members.map((name, index): Collaborator => ({ id: `member:${team.id}:${index}`, name, jobTitle: 'Técnico', teamId: team.id, accessRole: 'technician', active: true })),
    { id: `supervisor:${team.id}`, name: team.supervisor, jobTitle: 'Supervisor', teamId: team.id, accessRole: 'supervisor', active: true },
  ];
}
export const collaborators: Collaborator[] = teams.flatMap(collaboratorsForTeam);
