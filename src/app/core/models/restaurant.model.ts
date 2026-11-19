// TODO API: sem endpoint publico do restaurante. Nomes espelham a entidade Restaurant do Prisma;
// os campos marcados "fora do schema" ainda nao existem no banco e estao pedidos ao back-end.
export interface Restaurant {
  /** PK do restaurante (= users.id). O banco nao tem slug: e este id que vai em /restaurantes/:slug e em /users/:id/reviews. */
  userId: string;
  restaurantName: string;
  cuisineType: string;
  description: string | null;
  logoUrl: string | null;
  /** `null` enquanto nao houver avaliacoes; o calculo e do KMD-67. */
  averageRating: number | null;
  /** Fora do schema: o banco so tem `address` completo, e o perfil publico mostra apenas cidade/UF. */
  city: string | null;
  state: string | null;
  /** Fora do schema. */
  coverUrl: string | null;
  /** Fora do schema: texto livre como no prototipo ("R$ 5.000 + Gorjetas"). */
  payHighlight: string | null;
}

/** Vaga ja no formato de exibicao: setor, turno "Integral" e faixa salarial nao cabem no Job atual do banco. */
export interface OpenJob {
  id: string;
  title: string;
  sector: string;
  shift: string;
  description: string;
  salary: string | null;
  urgent: boolean;
}

/** Mesmo formato que `GET /users/:id/reviews` (KMD-38) devolve dentro de `data`. */
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
