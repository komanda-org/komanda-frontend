import { ContractType } from '../models/jobs.model';
import { JobStatus } from '../models/restaurant-jobs.model';

export const SHIFT_OPTIONS = [
  { value: 'MANHA', label: 'Manhã' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'NOITE', label: 'Noite' },
  { value: 'MADRUGADA', label: 'Madrugada' },
] as const;

export const CONTRACT_OPTIONS: readonly { value: ContractType; label: string }[] = [
  { value: 'CLT', label: 'CLT' },
  { value: 'PJ', label: 'PJ' },
  { value: 'FREELANCER', label: 'Freelancer' },
  { value: 'ESTAGIO', label: 'Estágio' },
];

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  ABERTA: 'Ativa',
  PAUSADA: 'Pausada',
  ENCERRADA: 'Encerrada',
};

export function shiftLabel(shift: string | null | undefined): string | null {
  if (!shift) {
    return null;
  }
  return SHIFT_OPTIONS.find((option) => option.value === shift)?.label ?? shift;
}

export function contractLabel(contractType: string): string {
  return CONTRACT_OPTIONS.find((option) => option.value === contractType)?.label ?? contractType;
}

/** "Noite · CLT", ou so o contrato quando a vaga nao tem turno. */
export function jobMeta(shift: string | null | undefined, contractType: string): string {
  return [shiftLabel(shift), contractLabel(contractType)].filter(Boolean).join(' · ');
}

export function jobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_LABELS[status] ?? status;
}

export function formatSalary(salary: number | string | null | undefined): string {
  if (salary === null || salary === undefined || salary === '') {
    return 'A combinar';
  }
  const amount = Number(salary);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
    : String(salary);
}
