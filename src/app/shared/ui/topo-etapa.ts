import { Component, computed, input, output } from '@angular/core';

/**
 * Barra de topo do cadastro: voltar, titulo da marca, contador de etapa e
 * progresso. Componente "burro": recebe numeros e devolve eventos, entao as
 * tres telas usam a mesma barra sem duplicar CSS.
 */
@Component({
  selector: 'app-topo-etapa',
  template: `
    <header class="topo">
      <button type="button" class="topo__voltar" [attr.aria-label]="rotuloVoltar()" (click)="voltar.emit()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 5l-7 7 7 7"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <h2 class="topo__titulo">{{ titulo() }}</h2>

      @if (total() > 1) {
        <span class="topo__etapa" [class.topo__etapa--pilula]="pilula()">
          {{ etapa() }} de {{ total() }}
        </span>
      } @else {
        <!-- Ocupa o mesmo espaco do contador para o titulo nao sair do centro. -->
        <span class="topo__etapa" aria-hidden="true"></span>
      }
    </header>

    <!--
      role="progressbar" + os aria-value* fazem o leitor de tela anunciar
      "2 de 3" sem depender do texto visual ao lado.
    -->
    <div
      class="progresso"
      role="progressbar"
      [attr.aria-valuenow]="etapa()"
      [attr.aria-valuemin]="1"
      [attr.aria-valuemax]="total()"
      [attr.aria-label]="'Etapa ' + etapa() + ' de ' + total()"
    >
      <div class="progresso__preenchido" [style.width.%]="porcentagem()"></div>
    </div>
  `,
})
export class TopoEtapa {
  readonly titulo = input.required<string>();
  readonly etapa = input(1);
  readonly total = input(1);
  readonly pilula = input(false);
  readonly rotuloVoltar = input('Voltar');

  readonly voltar = output<void>();

  /** Signal derivado: recalcula so quando `etapa` ou `total` mudam. */
  protected readonly porcentagem = computed(() => (this.etapa() / this.total()) * 100);
}
