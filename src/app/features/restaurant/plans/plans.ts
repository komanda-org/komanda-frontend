import { Component } from '@angular/core';

interface Plan {
  id: string;
  name: string;
  price: string;
  priceSuffix: string | null;
  tagline: string;
  featured: boolean;
  features: { label: string; included: boolean }[];
}

// TODO API: sem endpoint de planos/assinatura; conteudo fixo do prototipo e precos a definir.
export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 'R$ 0',
    priceSuffix: '/mês',
    tagline: 'Para começar a contratar',
    featured: false,
    features: [
      { label: '1 vaga ativa', included: true },
      { label: 'Até 10 candidaturas por vaga', included: true },
      { label: 'Pipeline básico', included: true },
      { label: 'Chat com candidatos aprovados', included: true },
      { label: 'Vagas urgentes', included: false },
      { label: 'Candidatos ilimitados', included: false },
      { label: 'Relatórios e métricas', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Profissional',
    price: 'Sob consulta',
    priceSuffix: null,
    tagline: 'Para restaurantes em crescimento',
    featured: true,
    features: [
      { label: '5 vagas ativas', included: true },
      { label: 'Candidaturas ilimitadas', included: true },
      { label: 'Pipeline completo com filtros', included: true },
      { label: 'Chat com candidatos aprovados', included: true },
      { label: 'Vagas urgentes', included: true },
      { label: 'Relatórios básicos', included: true },
      { label: 'Suporte prioritário', included: false },
      { label: 'API de integração', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Empresarial',
    price: 'Sob consulta',
    priceSuffix: null,
    tagline: 'Para redes e grandes operações',
    featured: false,
    features: [
      { label: 'Vagas ativas ilimitadas', included: true },
      { label: 'Candidaturas ilimitadas', included: true },
      { label: 'Pipeline completo avançado', included: true },
      { label: 'Chat integrado com IA', included: true },
      { label: 'Vagas urgentes em destaque', included: true },
      { label: 'Relatórios e métricas avançadas', included: true },
      { label: 'Suporte prioritário 24/7', included: true },
      { label: 'API de integração completa', included: true },
    ],
  },
];

@Component({
  selector: 'app-plans',
  templateUrl: './plans.html',
  styleUrl: './plans.scss',
})
export class Plans {
  protected readonly plans = PLANS;
}
