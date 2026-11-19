export type WorkModel = 'CLT' | 'PJ' | 'FREELANCER' | 'TEMPORARIO';
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
  profilePhoto: string | null;
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

/** Item de GET /users/:id/reviews (KMD-38). TODO API: a resposta nao traz o autor da avaliacao. */
export interface Review {
  id: string;
  /** 1 a 5. */
  rating: number;
  comment: string | null;
  jobId: string;
  reviewerId: string;
  createdAt: string;
}

export interface ReviewsPage {
  data: Review[];
  total: number;
  skip: number;
  take: number;
  averageRating: number | null;
}
