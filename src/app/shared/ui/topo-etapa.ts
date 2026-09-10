import { Component, computed, input, output } from '@angular/core';

/**
 * A barra de topo do cadastro: voltar, titulo da marca, contador de etapa
 * e a barra de progresso dourada logo abaixo.
 *
 * E um componente "burro": nao sabe em que etapa a aplicacao esta nem como
 * voltar. Recebe numeros e devolve um evento. Isso permite que as tres telas
 * de cadastro usem exatamente a mesma barra sem duplicar uma linha de CSS.
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

  /**
   * `computed` cria um signal derivado: recalcula sozinho quando `etapa` ou
   * `total` mudam, e so entao. Nao e um metodo reavaliado a cada ciclo — e um
   * valor com cache que sabe quando esta velho.
   */
  protected readonly porcentagem = computed(() => (this.etapa() / this.total()) * 100);
}
