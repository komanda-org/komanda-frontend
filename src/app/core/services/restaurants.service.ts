import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../models/api-error.model';
import { OpenJob, Restaurant } from '../models/restaurant.model';

// TODO API: sem endpoint publico do restaurante (dados + vagas abertas); dados travados do
// frame "Perfil Publico - L'Atelier des Sens" (Figma 439-112) ate o back-end publicar a rota.
// O slug e o users.id (provisorio); com o endpoint real entra um campo slug e o 404 falso sai.
const ATELIER: Restaurant = {
  userId: 'l-atelier-des-sens',
  restaurantName: "L'Atelier des Sens",
  cuisineType: 'Alta Gastronomia',
  description:
    "No L'Atelier des Sens, a gastronomia é elevada à sua forma mais pura, unindo técnica clássica francesa a ingredientes brasileiros de pequenos produtores. Acreditamos que a excelência não é um ato, mas um hábito cultivado a cada serviço.",
  logoUrl: null,
  averageRating: 4.9,
  city: 'São Paulo',
  state: 'SP',
  coverUrl: null,
  payHighlight: 'R$ 5.000 + Gorjetas',
};

const ATELIER_JOBS: OpenJob[] = [
  {
    id: 'chef-de-partie',
    title: 'Chef de Partie',
    sector: 'Cozinha Quente',
    shift: 'Integral',
    description:
      'Buscamos um Chef de Partie com experiência em praças de carnes e molhos clássicos. Valorizamos disciplina, organização da mise en place e vontade de crescer com a brigada.',
    salary: 'R$ 4.500 - R$ 6.000',
    urgent: true,
  },
  {
    id: 'sommelier-pleno',
    title: 'Sommelier Pleno',
    sector: 'Salão',
    shift: 'Noturno',
    description:
      'Responsável pela curadoria da nossa carta de vinhos naturais e biodinâmicos. Atendimento à mesa, harmonizações do menu degustação e treinamento da equipe de salão.',
    salary: 'R$ 5.000 + Gorjetas',
    urgent: false,
  },
];

// Mesmo formato que o api-error.interceptor entrega, para a tela ja tratar o 404 real.
const NOT_FOUND: ApiError = {
  status: 404,
  messages: ['Restaurante não encontrado.'],
};

@Injectable({ providedIn: 'root' })
export class RestaurantsService {
  getBySlug(slug: string): Observable<Restaurant> {
    return slug === ATELIER.userId ? of(ATELIER) : throwError(() => NOT_FOUND);
  }

  listOpenJobs(slug: string): Observable<OpenJob[]> {
    return slug === ATELIER.userId ? of(ATELIER_JOBS) : throwError(() => NOT_FOUND);
  }
}
