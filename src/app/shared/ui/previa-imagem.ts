import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';

/**
 * Previa da foto de perfil / logo: clique abre o seletor de arquivo e devolve a
 * imagem como data URL (base64) — a API ainda nao tem upload multipart. Com o
 * endpoint pronto, so este componente muda.
 *
 * COMPONENTE CONTROLADO: a imagem chega por `valor` e sai por `arquivoChange`.
 * Ele NAO guarda o data URL num signal proprio de proposito — as etapas do
 * cadastro vivem num `@switch`, que destroi e recria o componente ao trocar de
 * etapa. Um estado interno nasceria vazio na volta e a previa sumiria, mesmo
 * com o FormControl ainda preenchido.
 *
 * O unico estado que fica aqui e `falhou`, porque ele so descreve a ULTIMA
 * tentativa de escolher arquivo: nao e dado do formulario e nao faz falta
 * nenhuma se a pessoa mudar de etapa.
 */
@Component({
  selector: 'app-previa-imagem',
  template: `
    <!--
      role="button" + tabindex + Enter/Espaco: e uma <div> porque um <button>
      nativo nao aceita a moldura tracejada de 11rem sem brigar com os estilos
      de .botao. O teclado continua funcionando igual.
    -->
    <div
      class="previa"
      role="button"
      tabindex="0"
      [attr.aria-label]="mostrarImagem() ? 'Trocar imagem' : legendaVazia()"
      (click)="abrirSeletor()"
      (keydown.enter)="abrirSeletor()"
      (keydown.space)="$event.preventDefault(); abrirSeletor()"
    >
      @if (mostrarImagem()) {
        <img class="previa__img" [src]="valor()" [alt]="alt()" />
        <span class="previa__trocar">Trocar</span>
      } @else {
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 8.5A1.5 1.5 0 014.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0121 8.5v9A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5v-9z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" stroke-width="1.5" />
        </svg>

        <span class="previa__legenda">{{ legendaVazia() }}</span>
      }
    </div>

    <!--
      O remover fica FORA da area clicavel: um <button> dentro de um
      role="button" e um alvo dentro de outro alvo — o leitor de tela anuncia
      dois controles no mesmo lugar e o clique dispara os dois.
    -->
    @if (mostrarImagem()) {
      <button type="button" class="previa__remover" (click)="remover()">Remover</button>
    }

    @if (falhou()) {
      <p class="previa__erro" role="alert">Escolha uma imagem de até 5 MB.</p>
    }

    <!-- Input file oculto: quem abre o seletor e a área tracejada acima. -->
    <input
      #fileInput
      type="file"
      accept="image/*"
      class="previa__file"
      tabindex="-1"
      aria-hidden="true"
      (change)="arquivoSelecionado($event)"
    />
  `,
  styles: `
    :host {
      display: grid;
      justify-items: start;
      gap: var(--k-s-2);
    }

    .previa {
      position: relative;
      display: grid;
      gap: var(--k-s-2);
      place-content: center;
      place-items: center;

      /* Quadrado de verdade: a mesma medida nos dois eixos, elastica entre
         112px e 176px conforme a coluna do painel cresce. */
      width: clamp(7rem, 13vw, 11rem);
      aspect-ratio: 1;
      overflow: hidden;
      color: var(--k-ouro);
      cursor: pointer;
      background: rgb(255 255 255 / 2%);
      border: 1px dashed rgb(242 202 80 / 35%);
      border-radius: var(--k-raio);
      transition: border-color 160ms ease, background-color 160ms ease;

      &:hover {
        background: rgb(242 202 80 / 5%);
        border-color: var(--k-ouro);
      }

      &:focus-visible {
        outline: 2px solid var(--k-ouro);
        outline-offset: 2px;
      }
    }

    .previa__legenda {
      font-size: var(--k-t-xs);
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .previa__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Com imagem, a acao vira uma faixa sobre a base — o quadrado ja nao pode
       explicar o que faz, porque a imagem ocupa o espaco todo. */
    .previa__trocar {
      position: absolute;
      inset: auto 0 0;
      padding: var(--k-s-2);
      font-size: var(--k-t-xs);
      font-weight: 600;
      letter-spacing: 0.12em;
      color: var(--k-texto);
      text-align: center;
      text-transform: uppercase;
      background: rgb(0 0 0 / 65%);
    }

    .previa__remover {
      min-height: 2.25rem;
      padding: 0;
      font-size: var(--k-t-sm);
      color: var(--k-texto-fraco);
      text-decoration: underline;
      text-underline-offset: 3px;
      transition: color 140ms ease;

      &:hover {
        color: var(--k-erro);
      }
    }

    .previa__erro {
      max-width: clamp(7rem, 13vw, 11rem);
      font-size: var(--k-t-sm);
      color: var(--k-erro);
    }

    .previa__file {
      display: none;
    }
  `,
})
export class PreviaImagem {
  /** O data URL atual. Quem manda e o pai — ver o cabecalho da classe. */
  readonly valor = input('');

  readonly alt = input('Pré-visualização');
  readonly legendaVazia = input('Upload');

  /** Data URL escolhido, ou `null` quando a pessoa remove ou o arquivo falha. */
  readonly arquivoChange = output<string | null>();

  protected readonly falhou = signal(false);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly mostrarImagem = computed(() => !!this.valor() && !this.falhou());

  protected abrirSeletor(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected remover(): void {
    this.falhou.set(false);
    this.arquivoChange.emit(null);
  }

  protected arquivoSelecionado(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    // Limpa o input desde ja: sem isto, escolher o MESMO arquivo de novo nao
    // dispara `change` e a tela parece travada.
    input.value = '';

    if (!arquivo) {
      return;
    }

    if (!arquivo.type.startsWith('image/') || arquivo.size > 5 * 1024 * 1024) {
      this.falhou.set(true);
      this.arquivoChange.emit(null);
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      this.falhou.set(false);
      this.arquivoChange.emit(leitor.result as string);
    };

    leitor.onerror = () => {
      this.falhou.set(true);
      this.arquivoChange.emit(null);
    };

    leitor.readAsDataURL(arquivo);
  }
}
