import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

// ponytail: placeholder único p/ 4 rotas filhas; páginas reais substituem no próximo card.
@Component({
  selector: 'app-placeholder-page',
  template: `<h1>{{ title }}</h1>`,
})
export class PlaceholderPage {
  protected readonly title = inject(ActivatedRoute).snapshot.data['title'] ?? '';
}
