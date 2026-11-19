import { ContractType } from './jobs.model';

/** Vaga ABERTA dentro do perfil publico: mais recentes primeiro, no maximo 20. */
export interface OpenJob {
  id: string;
  title: string;
  contractType: ContractType;
  salary: number | null;
  shift: string | null;
  urgent: boolean;
  createdAt: string;
}

/** GET /restaurants/:id. Sem cnpj, e-mail nem plano. */
export interface Restaurant {
  /** users.id; o mesmo de /users/:id/reviews. */
  id: string;
  restaurantName: string;
  cuisineType: string;
  description: string;
  /** Endereco completo em texto. */
  address: string;
  phone: string;
  /** `null` = restaurante itinerante (so eventos). */
  zipCode: string | null;
  logoUrl: string | null;
  averageRating: number | null;
  reviewsCount: number;
  openJobs: OpenJob[];
}

export type RestaurantPublicProfile = Restaurant;
