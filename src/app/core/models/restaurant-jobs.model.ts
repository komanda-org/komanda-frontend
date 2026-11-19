import { ApplicationStatus } from './applications.model';
import { ContractType } from './jobs.model';

export type JobStatus = 'ABERTA' | 'PAUSADA' | 'ENCERRADA';

/** Item de GET /users/me/jobs. Aqui `salary` vem como numero, diferente de GET /jobs. */
export interface RestaurantJob {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  salary: number | string | null;
  contractType: ContractType;
  shift: string | null;
  status: JobStatus;
  urgent: boolean;
  createdAt: string;
}

export interface RestaurantJobsPage {
  data: RestaurantJob[];
  total: number;
  skip: number;
  take: number;
}

export interface ApplicantProfessional {
  id: string;
  fullName: string;
  mainRole: string;
  profilePhoto: string | null;
  experienceSummary: string | null;
  averageRating: number | null;
}

/** Item de GET /jobs/:id/applications. */
export interface Applicant {
  applicationId: string;
  status: ApplicationStatus;
  applicationDate: string;
  professional: ApplicantProfessional;
}

export interface ApplicantsPage {
  data: Applicant[];
  total: number;
  skip: number;
  take: number;
}

/** Corpo de POST /jobs. A API rejeita campo extra (forbidNonWhitelisted). */
export interface CreateJobPayload {
  title: string;
  description: string;
  contractType: ContractType;
  requirements?: string;
  salary?: number;
  shift?: string;
  urgent?: boolean;
}

export interface JobOverview {
  job: RestaurantJob;
  applicants: Applicant[];
}
