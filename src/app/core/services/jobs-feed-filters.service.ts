import { Injectable, signal } from '@angular/core';

export type FeedFilter = 'para-voce' | 'CLT' | 'PJ' | 'FREELANCER' | 'ESTAGIO' | null;

/** Filtros do feed ficam aqui para sobreviverem ao abrir o detalhe e voltar. */
@Injectable({ providedIn: 'root' })
export class JobsFeedFiltersService {
  readonly submittedQuery = signal('');
  readonly activeFilter = signal<FeedFilter>('para-voce');
  readonly selectedShift = signal<string | null>(null);
  readonly minSalary = signal<number | null>(null);
  readonly maxDistanceKm = signal<number | null>(null);
  searchInput = '';

  reset(): void {
    this.searchInput = '';
    this.submittedQuery.set('');
    this.activeFilter.set('para-voce');
    this.selectedShift.set(null);
    this.minSalary.set(null);
    this.maxDistanceKm.set(null);
  }
}
