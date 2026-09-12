export type Role = 'admin' | 'treinador' | 'assistente';

export interface Usuario {
  id: string;
  nome: string;
  senha?: string;
  role: Role;
}

export interface Turma {
  id: string;
  nome: string; // uppercase
  inicio: string; // hh:mm
  fim: string; // hh:mm
  vagas: number;
  dias: string[]; // ['Seg', 'Qua', 'Sex']
}

export interface Aluno {
  id: string;
  nome: string; // uppercase
  turma_id: string;
  turma_nome?: string;
  matricula: string; // YYYY-MM-DD
  vencimento: string; // YYYY-MM-DD
  nivel: number; // 1 a 5
  face_data: string; // Base64 JPEG ou vazio
}

export type PresencaStatus = 'P' | 'A' | 'F' | 'J' | '';

export interface Frequencia {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  data_aula: string; // YYYY-MM-DD
  status: PresencaStatus;
  justificativa?: string;
  hora?: string; // hh:mm:ss
}
