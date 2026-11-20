import { ContractType, JobShift } from '../models/jobs.model';
import { JobStatus } from '../models/restaurant-jobs.model';

export const SHIFT_OPTIONS: readonly { value: JobShift; label: string }[] = [
  { value: 'MANHA', label: 'Manhã' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'NOITE', label: 'Noite' },
  { value: 'INTEGRAL', label: 'Integral' },
];

/** A API recusa INTEGRAL junto com outro turno. */
export const FULL_DAY_SHIFT: JobShift = 'INTEGRAL';

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

/** "Manhã", "Manhã e Tarde", "Manhã, Tarde e Noite"; lista vazia = null. */
export function shiftsLabel(shifts: readonly string[] | null | undefined): string | null {
  const labels = (shifts ?? []).map(shiftLabel).filter((label): label is string => !!label);
  if (labels.length === 0) {
    return null;
  }
  return labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`;
}

export function contractLabel(contractType: string): string {
  return CONTRACT_OPTIONS.find((option) => option.value === contractType)?.label ?? contractType;
}

/** "Manhã e Tarde · CLT", ou so o contrato quando a vaga nao tem turno. */
export function jobMeta(shifts: readonly string[] | null | undefined, contractType: string): string {
  return [shiftsLabel(shifts), contractLabel(contractType)].filter(Boolean).join(' · ');
}

export function jobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_LABELS[status] ?? status;
}

export function formatPublishedAt(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );
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
