import { ApiError } from './api-error.model';

export type WorkModel ='CLT' | 'PJ' | 'FREELANCER' | 'TEMPORARIO';
export type Mobility = 'LOCAL' | 'REGIONAL' | 'NACIONAL' | 'INTERNACIONAL';

export interface Experience {
  id: string;
  company: string;
  role: string;
  /** Data ISO sem hora (YYYY-MM-DD). */
  startDate: string;
  /** `null` = emprego atual. */
  endDate: string | null;
  description: string | null;
}

export interface Availability {
  workModels: WorkModel[];
  mobility: Mobility | null;
}

export interface ProfessionalProfile {
  id: string;
  fullName: string;
  mainRole: string;
  profilePhoto: string | null;
  experienceSummary: string | null;
  specialties: string[];
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  experiences: Experience[];
  availability: Availability | null;
}

export type ProfessionalMe = ProfessionalProfile & { role: 'PROFISSIONAL' };

/** GET /professionals/:id: o perfil como um restaurante o ve. */
export interface PublicProfessionalProfile {
  id: string;
  fullName: string;
  profilePhoto: string | null;
  mainRole: string;
  interestedRoles: string[];
  specialties: string[];
  experienceSummary: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  workModels: WorkModel[];
  mobility: Mobility | null;
  averageRating: number | null;
  reviewsCount: number;
  memberSince: string | null;
  experiences: Omit<Experience, 'id'>[];
}

export type RestaurantPlan = 'FREE' | 'ESSENTIAL' | 'PRO';

export interface RestaurantMe {
  role: 'RESTAURANTE';
  /** users.id; e o mesmo id de /restaurantes/:id. */
  id: string;
  email: string;
  restaurantName: string;
  cnpj: string;
  cuisineType: string;
  description: string;
  address: string;
  phone: string;
  /** `null` = restaurante itinerante (so eventos). */
  zipCode: string | null;
  logoUrl: string | null;
  averageRating: number | null;
  plan: RestaurantPlan;
}

/** GET /users/me responde os dois papeis; `role` diferencia. */
export type Me = ProfessionalMe | RestaurantMe;

/** Para telas so do profissional: um restaurante vira o mesmo 403 que a API daria. */
export function requireProfessional(me: Me): ProfessionalMe {
  if (me.role !== 'PROFISSIONAL') {
    throw { status: 403, messages: [] } satisfies ApiError;
  }
  return me;
}

export interface ExperiencePayload {
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
}

// O PUT difere do GET: disponibilidade vai achatada na raiz e nenhum `id` e aceito (400).
export interface UpdateProfilePayload {
  fullName: string;
  mainRole: string;
  experienceSummary: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  specialties: string[];
  workModels: WorkModel[];
  mobility: Mobility | null;
  experiences: ExperiencePayload[];
}

export interface UpdateProfileResponse {
  userId: string;
  role: 'PROFISSIONAL';
  profile: ProfessionalProfile;
}

export interface ReviewAuthor {
  id: string;
  name: string;
  photo: string | null;
  role: 'PROFISSIONAL' | 'RESTAURANTE';
}

/** Item de GET /users/:id/reviews. `reviewer` pode faltar em respostas antigas. */
export interface Review {
  id: string;
  /** 1 a 5. */
  rating: number;
  comment: string | null;
  jobId: string;
  reviewerId: string;
  createdAt: string;
  reviewer?: ReviewAuthor | null;
}

/** Corpo de POST /users/reviews. A API rejeita campo extra (forbidNonWhitelisted). */
export interface CreateReviewPayload {
  jobId: string;
  receiverId: string;
  /** Inteiro de 1 a 5. */
  rating: number;
  comment?: string;
}

export interface ReviewsPage {
  data: Review[];
  total: number;
  skip: number;
  take: number;
  averageRating: number | null;
}
