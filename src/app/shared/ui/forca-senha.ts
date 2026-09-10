import { Component, computed, input } from '@angular/core';

/**
 * Medidor de forca da senha — as quatro barrinhas e o rotulo "FORCA: MEDIA"
 * que aparecem no prototipo logo abaixo do campo.
 *
 * Nao e validacao: a regra da API continua sendo so o tamanho (8 a 64). Isto
 * e orientacao — mostra ao usuario que "12345678" passa mas e fraca, sem
 * impedir ninguem de enviar.
 */
type Nivel = 0 | 1 | 2 | 3 | 4;

@Component({
  selector: 'app-forca-senha',
  template: `
    <div class="forca">
      <div class="forca__barras" aria-hidden="true">
        @for (faixa of faixas; track faixa) {
          <span class="forca__barra" [class.forca__barra--cheia]="nivel() >= faixa" [style.background]="cor()"></span>
        }
      </div>

      <!-- aria-live faz o leitor de tela anunciar a mudanca de forca enquanto
           a pessoa digita, sem precisar sair do campo. -->
      <p class="forca__texto" aria-live="polite">
        @if (nivel() > 0) {
          Força: <strong [style.color]="cor()">{{ rotulo() }}</strong>
        }
      </p>
    </div>
  `,
  styles: `
    .forca {
      display: flex;
      gap: var(--k-s-3);
      align-items: center;
      margin-top: var(--k-s-2);
    }

    .forca__barras {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      flex: 1;
    }

    .forca__barra {
      height: 3px;
      background: var(--k-linha) !important;
      border-radius: var(--k-raio-pilula);
      transition: background-color 200ms ease;
    }

    .forca__barra--cheia {
      background: currentcolor;
    }

    .forca__texto {
      font-size: var(--k-t-xs);
      font-weight: 500;
      letter-spacing: 0.08em;
      color: var(--k-texto-placeholder);
      text-transform: uppercase;
      white-space: nowrap;
    }
  `,
})
export class ForcaSenha {
  readonly senha = input('');

  protected readonly faixas = [1, 2, 3, 4] as const;

  /**
   * Um ponto por criterio atendido. Nao e uma medida criptografica de entropia
   * — e um empurrao honesto: comprimento primeiro, porque e o que mais importa
   * de verdade, depois variedade de caracteres.
   */
  protected readonly nivel = computed<Nivel>(() => {
    const valor = this.senha();

    if (valor.length === 0) {
      return 0;
    }

    let pontos = 0;

    if (valor.length >= 8) pontos++;
    if (valor.length >= 12) pontos++;
    if (/[a-z]/.test(valor) && /[A-Z]/.test(valor)) pontos++;
    if (/\d/.test(valor) && /[^\w\s]/.test(valor)) pontos++;

    // Senha curta nunca passa de "fraca", por mais variada que seja.
    if (valor.length < 8) {
      return 1;
    }

    return Math.max(1, pontos) as Nivel;
  });

  protected readonly rotulo = computed(() => {
    switch (this.nivel()) {
      case 1:
        return 'fraca';
      case 2:
        return 'média';
      case 3:
        return 'boa';
      case 4:
        return 'forte';
      default:
        return '';
    }
  });

  protected readonly cor = computed(() => {
    switch (this.nivel()) {
      case 1:
        return 'var(--k-erro)';
      case 2:
        return 'var(--k-ouro)';
      default:
        return 'var(--k-ok)';
    }
  });
}
