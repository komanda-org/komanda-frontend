import { Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Campo de multiplas etiquetas — usado em "Outras funcoes de interesse",
 * o unico campo do formulario cujo valor e `string[]` e nao `string`.
 *
 * CONCEITO: ControlValueAccessor
 * O Angular so sabe conversar com <input>, <select> e <textarea>. Para que ele
 * consiga usar formControlName num componente NOSSO, precisamos ensina-lo a
 * traduzir — e esse tradutor e o ControlValueAccessor. Ele tem 4 metodos:
 *
 *   writeValue        -> o formulario manda um valor PARA a tela
 *   registerOnChange  -> guardamos o callback para avisar o formulario de mudancas
 *   registerOnTouched -> guardamos o callback de "o usuario saiu do campo"
 *   setDisabledState  -> o formulario liga/desliga o campo
 *
 * Sem isso, `<app-tags formControlName="...">` daria erro em tempo de execucao.
 */
@Component({
  selector: 'app-tags',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // forwardRef porque a classe Tags ainda nao existe nesta linha:
      // o decorator e avaliado ANTES da declaracao da classe terminar.
      useExisting: forwardRef(() => Tags),
      multi: true,
    },
  ],
  template: `
    <div class="tags" [class.tags--desabilitado]="desabilitado()">
      @for (tag of tags(); track tag) {
        <span class="tags__item">
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

      <input
        id="interestedRoles"
        class="tags__entrada"
        type="text"
        autocomplete="off"
        [disabled]="desabilitado()"
        [value]="rascunho()"
        [placeholder]="tags().length ? '' : 'Cozinheiro, Barista…'"
        (input)="rascunho.set(valorDigitado($event))"
        (keydown)="aoTeclar($event)"
        (blur)="aoSair()"
      />
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

    /* A etiqueta do prototipo: pilula escura de contorno, texto claro e o x. */
    .tags__item {
      display: inline-flex;
      gap: var(--k-s-1);
      align-items: center;
      padding: 3px var(--k-s-1) 3px var(--k-s-3);
      font-size: var(--k-t-xs);
      font-weight: 500;
      color: var(--k-texto);
      background: var(--k-superficie-2);
      border: 1px solid var(--k-linha-forte);
      border-radius: var(--k-raio-pilula);
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

    .tags__entrada {
      flex: 1;
      min-width: 8rem;
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
  `,
})
export class Tags implements ControlValueAccessor {
  protected readonly tags = signal<string[]>([]);
  protected readonly desabilitado = signal(false);
  protected readonly rascunho = signal('');

  // Callbacks entregues pelo Angular. Comecam como no-op para o caso do
  // componente ser usado fora de um formulario.
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

  protected valorDigitado(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected aoTeclar(evento: KeyboardEvent): void {
    // Enter e virgula confirmam a etiqueta.
    if (evento.key === 'Enter' || evento.key === ',') {
      // Sem preventDefault, o Enter dispararia o submit do formulario inteiro.
      evento.preventDefault();
      this.confirmar();
      return;
    }

    // Backspace com o input vazio apaga a ultima etiqueta — atalho esperado
    // por quem ja usou qualquer campo de tags.
    if (evento.key === 'Backspace' && this.rascunho().length === 0) {
      const atuais = this.tags();

      if (atuais.length > 0) {
        this.publicar(atuais.slice(0, -1));
      }
    }
  }

  /** Sair do campo com texto pendente nao pode perder o que foi digitado. */
  protected aoSair(): void {
    this.confirmar();
    this.aoTocar();
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

    // Evita duplicata sem diferenciar maiuscula de minuscula nem acento:
    // "Garçom" e "garcom" sao a mesma funcao.
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
