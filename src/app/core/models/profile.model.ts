// TODO API: o Jira nao tem card do GET /users/me; formato abaixo a confirmar com o back-end.
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
  mobility: Mobility;
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

export interface ReviewAuthor {
  name: string;
  role: string | null;
}

/** GET /users/:id/reviews (KMD-38). */
export interface Review {
  id: string;
  /** 1 a 5. */
  rating: number;
  comment: string;
  createdAt: string;
  author: ReviewAuthor;
}
