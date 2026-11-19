/**
 * Contrato de GET /users/me/applications (komanda-api: MyApplicationsController,
 * dto/my-application-response.dto.ts). Os nomes espelham a API: nao traduza
 * aqui, traduza na tela (toBadge).
 */

/** Enum CandidaturaStatus do Prisma. */
export type ApplicationStatus = 'PENDENTE' | 'APROVADA' | 'REJEITADA';

export interface MyApplicationJob {
  id: string;
  title: string;
}

export interface MyApplicationRestaurant {
  id: string;
  name: string;
}

export interface MyApplication {
  applicationId: string;
  status: ApplicationStatus;
  /** ISO 8601 — o `Date` do Nest vira string no JSON. */
  applicationDate: string;
  job: MyApplicationJob;
  restaurant: MyApplicationRestaurant;
}

/** A resposta e paginada: a lista vem em `data`, nao na raiz. */
export interface MyApplicationsPage {
  data: MyApplication[];
  total: number;
  skip: number;
  take: number;
}
