import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { mensagemDoErro } from '../../core/validators/mensagens-de-erro';

/**
 * Moldura de um campo: rotulo em cima, erro/dica/contador embaixo. O input NAO
 * vive aqui — chega por `<ng-content>`: cuidar da moldura e deixar o input nativo
 * fazer o que ja faz bem (autofill, `type="email"`, teclado certo no celular).
 */
@Component({
  selector: 'app-campo',
  template: `
    <div class="campo">
      <label class="campo__rotulo" [attr.for]="para()">
        {{ rotulo() }}
        @if (opcional()) {
          <span class="campo__opcional">opcional</span>
        }
      </label>

      <ng-content />

      <!-- O rodape so existe se tiver o que dizer. Renderiza-lo vazio deixaria
           8px de espaco morto embaixo de todo campo sem dica nem contador. -->
      @if (erro() || dica() || maximo()) {
        <div class="campo__rodape">
          @if (erro(); as texto) {
            <span class="campo__erro" [id]="para() + '-erro'" role="alert">{{ texto }}</span>
          } @else if (dica()) {
            <span class="campo__dica">{{ dica() }}</span>
          }

          @if (maximo(); as limite) {
            <span class="campo__contador" aria-hidden="true">{{ preenchido() }}/{{ limite }}</span>
          }
        </div>
      }
    </div>
  `,
})
export class Campo {
  /** `input.required` faz o compilador reclamar se alguem esquecer de passar. */
  readonly rotulo = input.required<string>();
  readonly para = input.required<string>();
  readonly controle = input.required<AbstractControl>();

  readonly dica = input<string>('');
  readonly opcional = input(false);
  /** Quando informado, mostra contador de caracteres. */
  readonly maximo = input<number | null>(null);

  /**
   * Metodo, e nao `computed()`: o estado de um FormControl (touched, errors)
   * nao e signal, entao `computed` nao perceberia a mudanca.
   */
  protected erro(): string | null {
    const controle = this.controle();

    // Erro so depois da saida do campo (touched): acusar enquanto digita e hostil.
    if (!controle.touched || controle.valid) {
      return null;
    }

    return mensagemDoErro(controle.errors, this.rotulo());
  }

  protected preenchido(): number {
    const valor: unknown = this.controle().value;
    return typeof valor === 'string' ? valor.length : 0;
  }
}
