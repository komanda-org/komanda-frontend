import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Campo de multiplas etiquetas com autocomplete — "Outras funcoes de interesse"
 * e "Habilidades".
 *
 * Herda de ControlValueAccessor, o tradutor que permite usar `formControlName`
 * num componente nosso (sem ele, `<app-tags formControlName="...">` quebra em
 * runtime): `writeValue` recebe o valor, `registerOnChange` devolve as mudancas
 * para o formulario, `registerOnTouched` avisa a saida e `setDisabledState`
 * liga/desliga.
 */
@Component({
  selector: 'app-tags',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // forwardRef: o decorator e avaliado antes da classe Tags existir.
      useExisting: forwardRef(() => Tags),
      multi: true,
    },
  ],
  template: `
    <div class="tags" [class.tags--desabilitado]="desabilitado()">
      @for (tag of tags(); track tag) {
        <span class="tags__item k-tag">
          {{ tag }}
          <button
            type="button"
            class="tags__remover"
            [disabled]="desabilitado()"
            [attr.aria-label]="'Remover ' + tag"
            (click)="remover(tag)"
          >
            &times;
          </button>
        </span>
      }

      <div class="tags__entrada-wrap" (click)="focar()">
        <input
          #entrada
          class="tags__entrada"
          type="text"
          autocomplete="off"
          [disabled]="desabilitado()"
          [value]="rascunho()"
          [placeholder]="tags().length ? '' : placeholder()"
          (input)="rascunho.set(valorDigitado($event))"
          (keydown)="aoTeclar($event)"
          (blur)="aoSair()"
          (focus)="sugestoesAbertas.set(true)"
        />
        @if (sugestoesAbertas() && sugestoesFiltradas().length > 0 && !desabilitado()) {
          <ul class="tags__sugestoes" role="listbox">
            @for (sug of sugestoesFiltradas(); track sug) {
              <li class="tags__sugestao" role="option" (mousedown)="selecionarSugestao(sug)">
                {{ sug }}
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
  styles: `
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--k-s-2);
      align-items: center;
      padding: var(--k-s-2) var(--k-s-3);
      background: var(--k-campo);
      border: 1px solid var(--k-linha-forte);
      border-radius: var(--k-raio);
      transition: border-color 140ms ease, background-color 140ms ease;
    }

    .tags:focus-within {
      background: var(--k-superficie);
      border-color: var(--k-ouro);
    }

    .tags--desabilitado {
      opacity: 0.5;
    }

    /* Visual vem da .k-tag global; aqui so o respiro menor a direita, por causa do x. */
    .tags__item {
      padding: 3px var(--k-s-1) 3px var(--k-s-3);
    }

    .tags__remover {
      display: grid;
      place-items: center;
      width: 1.25rem;
      height: 1.25rem;
      font-size: 1rem;
      line-height: 1;
      color: var(--k-texto-fraco);
      border-radius: 50%;
    }

    .tags__remover:hover:not(:disabled) {
      color: var(--k-fundo);
      background: var(--k-ouro);
    }

    .tags__entrada-wrap {
      position: relative;
      flex: 1;
      min-width: 8rem;
    }

    .tags__entrada {
      width: 100%;
      padding: var(--k-s-2) 0;
      background: transparent;
      border: 0;
    }

    .tags__entrada:focus {
      outline: none;
    }

    .tags__entrada::placeholder {
      color: var(--k-texto-placeholder);
    }

    /* Dropdown de sugestoes */
    .tags__sugestoes {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: var(--k-s-1);
      padding: var(--k-s-2);
      background: var(--k-superficie);
      border: 1px solid var(--k-linha-forte);
      border-radius: var(--k-raio);
      list-style: none;
      z-index: 10;
      box-shadow: 0 8px 24px rgb(0 0 0 / 40%);
      max-height: 16rem;
      overflow-y: auto;
    }

    .tags__sugestao {
      padding: var(--k-s-2) var(--k-s-3);
      font-size: var(--k-t-sm);
      color: var(--k-texto);
      cursor: pointer;
      border-radius: var(--k-raio);
      transition: background-color 100ms ease;
    }

    .tags__sugestao:hover {
      background: var(--k-campo);
      color: var(--k-ouro);
    }
  `,
})
export class Tags implements ControlValueAccessor {
  /** Lista de sugestoes para autocomplete (ex: HABILIDADES, CARGOS). */
  readonly sugestoes = input<readonly string[]>([]);

  /** Placeholder do input quando nao ha tags. */
  readonly placeholder = input('Cozinheiro, Barista…');

  protected readonly tags = signal<string[]>([]);
  protected readonly desabilitado = signal(false);
  protected readonly rascunho = signal('');
  protected readonly sugestoesAbertas = signal(false);

  // Callbacks do Angular; no-op quando usado fora de um formulario.
  private aoMudar: (valor: string[]) => void = () => {};
  private aoTocar: () => void = () => {};

  writeValue(valor: string[] | null): void {
    this.tags.set(valor ?? []);
  }

  registerOnChange(fn: (valor: string[]) => void): void {
    this.aoMudar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.aoTocar = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado.set(desabilitado);
  }

  /** Sugestoes filtradas pelo que o usuario digitou (case/acento-insensivel). */
  protected readonly sugestoesFiltradas = computed(() => {
    const termo = this.rascunho().trim().toLowerCase();
    if (!termo) return this.sugestoes().slice(0, 10);
    return this.sugestoes().filter(s =>
      s.toLowerCase().includes(termo)
    ).slice(0, 10);
  });

  protected valorDigitado(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected focar(): void {
    this.sugestoesAbertas.set(true);
  }

  protected aoTeclar(evento: KeyboardEvent): void {
    // Enter e virgula confirmam a etiqueta.
    if (evento.key === 'Enter' || evento.key === ',') {
      // Sem preventDefault, o Enter dispararia o submit do formulario inteiro.
      evento.preventDefault();
      this.confirmar();
      return;
    }

    // Backspace com o input vazio apaga a ultima etiqueta.
    if (evento.key === 'Backspace' && this.rascunho().length === 0) {
      const atuais = this.tags();

      if (atuais.length > 0) {
        this.publicar(atuais.slice(0, -1));
      }
    }

    // Seta para baixo abre sugestoes
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      this.sugestoesAbertas.set(true);
    }

    // Escape fecha sugestoes
    if (evento.key === 'Escape') {
      this.sugestoesAbertas.set(false);
    }
  }

  /** Sair do campo com texto pendente nao pode perder o que foi digitado. */
  protected aoSair(): void {
    this.confirmar();
    this.aoTocar();
    // Fecha sugestoes com delay para permitir click no item
    setTimeout(() => this.sugestoesAbertas.set(false), 150);
  }

  protected selecionarSugestao(sug: string): void {
    // Evita duplicata
    const jaExiste = this.tags().some(
      (tag) => tag.localeCompare(sug, 'pt-BR', { sensitivity: 'base' }) === 0,
    );
    if (!jaExiste) {
      this.publicar([...this.tags(), sug]);
    }
    this.rascunho.set('');
    this.sugestoesAbertas.set(false);
  }

  protected remover(alvo: string): void {
    this.publicar(this.tags().filter((tag) => tag !== alvo));
    this.aoTocar();
  }

  private confirmar(): void {
    const texto = this.rascunho().trim().replace(/,+$/, '').trim();
    this.rascunho.set('');

    if (!texto) {
      return;
    }

    // Evita duplicata sem diferenciar maiuscula nem acento.
    const jaExiste = this.tags().some(
      (tag) => tag.localeCompare(texto, 'pt-BR', { sensitivity: 'base' }) === 0,
    );

    if (jaExiste) {
      return;
    }

    this.publicar([...this.tags(), texto]);
  }

  private publicar(novas: string[]): void {
    this.tags.set(novas);
    this.aoMudar(novas);
  }
}
