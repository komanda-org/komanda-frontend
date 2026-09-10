import { Component, computed, input, signal } from '@angular/core';

/**
 * Previa da foto de perfil / logo.
 *
 * No prototipo isto e um botao de upload. Aqui e uma PREVIA: os campos da task
 * (`profilePhoto` e `logoUrl`) sao URLs, nao arquivos — a API espera um link,
 * nao um multipart. Entao o circulo mostra o que a URL colada aponta, e vira
 * um placeholder tracejado enquanto nao ha nada valido.
 *
 * Quando existir endpoint de upload, e este componente que muda — e so ele.
 */
@Component({
  selector: 'app-previa-imagem',
  template: `
    <div class="previa" [class.previa--quadrada]="formato() === 'quadrado'">
      @if (mostrarImagem()) {
        <!-- (error) cobre URL que existe mas nao e imagem, ou que caiu.
             Sem isto o alt apareceria quebrado dentro do circulo. -->
        <img class="previa__img" [src]="url()" [alt]="alt()" (error)="falhou.set(true)" />
      } @else {
        <span class="previa__vazio" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 8.5A1.5 1.5 0 014.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0121 8.5v9A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5v-9z"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" stroke-width="1.6" />
          </svg>
        </span>
      }
    </div>

    <p class="previa__rotulo">{{ legenda() }}</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--k-s-2);
      align-items: center;
      margin-bottom: var(--k-s-5);
    }

    .previa {
      display: grid;
      place-items: center;
      width: 5.5rem;
      height: 5.5rem;
      overflow: hidden;
      color: var(--k-ouro);
      background: var(--k-superficie-2);
      border: 1px dashed var(--k-linha-forte);
      border-radius: 50%;
    }

    .previa--quadrada {
      width: 4.5rem;
      height: 4.5rem;
      border-radius: var(--k-raio);
    }

    .previa__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .previa__vazio {
      display: grid;
      place-items: center;
    }

    .previa__rotulo {
      font-size: var(--k-t-xs);
      font-weight: 500;
      letter-spacing: 0.12em;
      color: var(--k-texto-placeholder);
      text-transform: uppercase;
    }
  `,
})
export class PreviaImagem {
  readonly url = input('');
  readonly formato = input<'circulo' | 'quadrado'>('circulo');
  readonly alt = input('Pré-visualização');
  readonly legendaVazia = input('Adicionar foto');

  protected readonly falhou = signal(false);

  protected readonly mostrarImagem = computed(() => {
    const endereco = this.url().trim();

    // Zera o "falhou" quando a URL muda: uma URL nova merece nova tentativa.
    // Ler `url()` aqui e o que liga este computed a mudanca do input.
    return endereco.startsWith('http') && !this.falhou();
  });

  protected readonly legenda = computed(() =>
    this.mostrarImagem() ? 'Pré-visualização' : this.legendaVazia(),
  );
}
