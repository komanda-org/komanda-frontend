import { Component, computed, input } from '@angular/core';

/**
 * Medidor de forca da senha (barrinhas + rotulo). NAO e validacao: a regra da
 * API continua so o tamanho (8 a 64) — isto e orientacao.
 */
type Nivel = 0 | 1 | 2 | 3 | 4;

@Component({
  selector: 'app-forca-senha',
  template: `
    <div class="forca">
      <div class="forca__barras" aria-hidden="true">
        @for (faixa of faixas; track faixa) {
          <span class="forca__barra" [class.forca__barra--cheia]="nivel() >= faixa"></span>
        }
      </div>

      <!-- aria-live faz o leitor de tela anunciar a mudanca de forca enquanto
           a pessoa digita, sem precisar sair do campo. -->
      <p class="forca__texto" aria-live="polite">
        @if (nivel() > 0) {
          FORÇA: <strong>{{ rotulo() }}</strong>
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
      height: 4px;
      background: var(--k-linha);
      border-radius: var(--k-raio-pilula);
      transition: background-color 200ms ease;
    }

    .forca__barra--cheia {
      background: var(--k-ouro);
    }

    .forca__texto {
      font-family: var(--k-sans);
      font-size: var(--k-t-2xs); /* 10px */
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--k-ouro);
      text-transform: uppercase;
      white-space: nowrap;
    }
  `,
})
export class ForcaSenha {
  readonly senha = input('');

  protected readonly faixas = [1, 2, 3, 4] as const;

  /** Um ponto por criterio: comprimento primeiro, depois variedade. */
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
        return 'FRACA';
      case 2:
        return 'MÉDIA';
      case 3:
        return 'BOA';
      case 4:
        return 'FORTE';
      default:
        return '';
    }
  });
}
