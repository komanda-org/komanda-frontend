import { Component, computed, input, output, signal, viewChild, ElementRef } from '@angular/core';

/**
 * Previa da foto de perfil / logo: clique abre o seletor de arquivo e mostra o
 * preview como data URL (base64) — a API ainda nao tem upload multipart. Com o
 * endpoint pronto, so este componente muda.
 */
@Component({
  selector: 'app-previa-imagem',
  template: `
    <div
      class="previa"
      [class.previa--quadrada]="formato() === 'quadrado'"
      (click)="abrirSeletor()"
      tabindex="0"
      (keydown.enter)="abrirSeletor()"
      (keydown.space)="$event.preventDefault(); abrirSeletor()"
      role="button"
      aria-label="Clique para escolher imagem"
    >
      @if (mostrarImagem()) {
        <img class="previa__img" [src]="previewUrl()" [alt]="alt()" />
      } @else {
        <span class="previa__vazio" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
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

    <!-- Input file oculto, so para abrir o seletor -->
    <input
      #fileInput
      type="file"
      accept="image/*"
      class="previa__file-input"
      (change)="arquivoSelecionado($event)"
      aria-hidden="true"
    />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--k-s-3);
      align-items: center;
    }

    .previa {
      display: grid;
      place-items: center;
      width: 7.5rem;
      height: 7.5rem;
      overflow: hidden;
      color: var(--k-ouro);
      background: #0e0e0e;
      border: 1px dashed rgb(242 202 80 / 40%);
      border-radius: 50%;
      cursor: pointer;
      transition: border-color 160ms ease, background-color 160ms ease;
      position: relative;

      &:hover {
        border-color: var(--k-ouro);
        background: rgb(242 202 80 / 5%);
      }

      &:focus-visible {
        outline: 2px solid var(--k-ouro);
        outline-offset: 2px;
      }
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
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      color: rgb(242 202 80 / 80%);
      text-transform: uppercase;
    }

    .previa__file-input {
      display: none;
    }
  `,
})
export class PreviaImagem {
  readonly formato = input<'circulo' | 'quadrado'>('circulo');
  readonly alt = input('Pré-visualização');
  readonly legendaVazia = input('Adicionar foto');

  /** Emite o data URL (base64) quando o usuario escolhe um arquivo. */
  readonly arquivoChange = output<string | null>();

  protected readonly previewUrl = signal<string | null>(null);
  protected readonly falhou = signal(false);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly mostrarImagem = computed(() => !!this.previewUrl() && !this.falhou());

  protected readonly legenda = computed(() =>
    this.mostrarImagem() ? 'Pré-visualização' : this.legendaVazia(),
  );

  protected abrirSeletor(): void {
    // Abre o seletor de arquivos do navegador via input oculto
    this.fileInput()?.nativeElement.click();
  }

  protected arquivoSelecionado(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    // Validacao basica: so imagens, max 5MB
    if (!arquivo.type.startsWith('image/')) {
      this.falhou.set(true);
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      this.falhou.set(true);
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => {
      this.previewUrl.set(leitor.result as string);
      this.falhou.set(false);
      this.arquivoChange.emit(leitor.result as string);
    };
    leitor.onerror = () => {
      this.falhou.set(true);
      this.arquivoChange.emit(null);
    };
    leitor.readAsDataURL(arquivo);

    // Limpa o input para permitir selecionar o mesmo arquivo de novo
    input.value = '';
  }
}
