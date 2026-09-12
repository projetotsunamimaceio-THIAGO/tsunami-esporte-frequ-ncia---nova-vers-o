import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Aluno } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Funções utilitárias de Data
export function formatDataBR(dataIso: string): string {
  if (!dataIso) return '';
  const [y, m, d] = dataIso.split('-');
  return `${d}/${m}/${y}`;
}

export function getCurrentDateISO(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function getCurrentTime(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

export function isVencido(dataVencimento: string): boolean {
  if (!dataVencimento) return false;
  return new Date(dataVencimento) < new Date(getCurrentDateISO());
}

// Snake Draft Teams
export function generateSnakeDraft(players: Aluno[], numTeams: number) {
  // Sort players by level desc
  const sorted = [...players].sort((a, b) => b.nivel - a.nivel);
  
  const teams: { players: Aluno[]; totalStars: number }[] = Array.from({ length: numTeams }, () => ({
    players: [],
    totalStars: 0
  }));

  let forward = true;
  let teamIdx = 0;

  for (const player of sorted) {
    teams[teamIdx].players.push(player);
    teams[teamIdx].totalStars += player.nivel;

    if (forward) {
      if (teamIdx === numTeams - 1) {
        forward = false;
      } else {
        teamIdx++;
      }
    } else {
      if (teamIdx === 0) {
        forward = true;
      } else {
        teamIdx--;
      }
    }
  }

  return teams;
}
