// TODO API: valores de status e formato conferidos com o KMD-34 quando o endpoint estiver no ar.
export type ApplicationStatus = 'PENDING' | 'MATCHED' | 'REJECTED';

export interface ApplicationRestaurant {
  restaurantName: string;
  logoUrl: string | null;
}

export interface ApplicationJob {
  id: string;
  title: string;
  restaurant: ApplicationRestaurant;
}

export interface MyApplication {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  job: ApplicationJob;
}
