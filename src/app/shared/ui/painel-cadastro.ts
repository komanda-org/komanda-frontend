import { Component, computed, input, output } from '@angular/core';

/**
 * A COLUNA ESQUERDA do cadastro.
 *
 * No prototipo ela nao e decoracao: carrega o "onde estou" inteiro — voltar,
 * nome do fluxo, contador, barra de progresso, titulo da etapa e, quando a
 * etapa pede, o upload de imagem. A coluna da direita fica so com os campos.
 *
 * O que e proprio da etapa (eyebrow, titulo, foto) chega por `<ng-content />`,
 * porque muda a cada tela; o que e igual em todas (a barra de cima) fica aqui.
 */
@Component({
  selector: 'app-painel-cadastro',
  host: { class: 'painel' },
  template: `
    <header class="painel__topo">
      <button
        type="button"
        class="painel__voltar"
        [attr.aria-label]="rotuloVoltar()"
        (click)="voltar.emit()"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M19 12H5m0 0l6-6m-6 6l6 6"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <p class="painel__marca">{{ marca() }}</p>

      <span class="painel__contador">{{ etapa() }} de {{ total() }}</span>
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

    <div class="painel__conteudo">
      <ng-content />
    </div>

    <p class="painel__rodape">Política de privacidade · LGPD</p>
  `,
})
export class PainelCadastro {
  readonly etapa = input(1);
  readonly total = input(1);
  readonly marca = input('Criar conta');
  readonly rotuloVoltar = input('Voltar');

  readonly voltar = output<void>();

  /** Signal derivado: recalcula so quando `etapa` ou `total` mudam. */
  protected readonly porcentagem = computed(() => (this.etapa() / this.total()) * 100);
}
