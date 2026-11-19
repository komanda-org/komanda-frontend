export type ContractType = 'CLT' | 'PJ' | 'FREELANCER' | 'ESTAGIO';

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
  shift?: string | null;
  /** Calculada no navegador: `undefined` = ainda calculando; `null` = nao foi possivel. */
  distanceKm?: number | null;
  urgent?: boolean;
  hasApplied?: boolean;
  application?: Application | null;
}

export interface JobsResponse {
  data: Job[];
  total: number;
  skip: number;
  take: number;
}

export interface Application {
  id: string;
  jobId: string;
  professionalId: string;
  createdAt: string;
}
