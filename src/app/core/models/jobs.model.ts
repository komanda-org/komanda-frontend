import { ApplicationStatus } from './applications.model';

export type ContractType = 'CLT' | 'PJ' | 'FREELANCER' | 'ESTAGIO';

export type JobShift = 'MANHA' | 'TARDE' | 'NOITE' | 'INTEGRAL';

export interface JobRestaurant {
  restaurantName: string;
  logoUrl: string | null;
  address: string;
  /** `null` = restaurante itinerante (so eventos). */
  zipCode: string | null;
  cuisineType: string;
  averageRating: number | null;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  salary: string | null;
  contractType: ContractType;
  status: string;
  restaurantId: string;
  restaurant: JobRestaurant;
  createdAt: string;
  /** Lista vazia = turno nao informado. */
  shifts: JobShift[];
  /** Vem da API quando a busca manda lat/lng; `null` = restaurante sem coordenadas. */
  distanceKm?: number | null;
  urgent?: boolean;
  hasApplied?: boolean;
  /** So em GET /jobs/:id: a candidatura de quem esta logado. */
  application?: JobApplication | null;
}

export interface JobsResponse {
  data: Job[];
  total: number;
  skip: number;
  take: number;
}

export interface JobApplication {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
}

/** Resposta de POST /jobs/:id/applications. */
export interface Application {
  id: string;
  jobId: string;
  professionalId: string;
  createdAt: string;
}
