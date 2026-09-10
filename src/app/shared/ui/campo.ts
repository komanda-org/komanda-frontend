import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { mensagemDoErro } from '../../core/validators/mensagens-de-erro';

/**
 * Moldura de um campo: rotulo em cima, o control no meio, erro/dica/contador embaixo.
 *
 * O input em si NAO vive aqui dentro — ele e projetado com <ng-content>. Foi uma
 * escolha deliberada: envolver o <input> nativo num ControlValueAccessor proprio
 * daria mais codigo e tiraria de graca coisas que o navegador ja faz bem
 * (autofill, type="email" abrindo o teclado certo no celular, autocomplete).
 *
 * Entao aqui a regra e: o componente cuida da MOLDURA, o HTML nativo cuida do
 * CONTROL. Cada um faz o que faz melhor.
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
   * Metodo, e nao `computed()`. Motivo: `computed` so recalcula quando um SIGNAL
   * do qual ele depende muda — e o estado de um FormControl (touched, errors)
   * nao e signal. Um metodo e reavaliado a cada ciclo de deteccao de mudanca,
   * que e exatamente quando o estado do formulario pode ter mudado.
   */
  protected erro(): string | null {
    const controle = this.controle();

    // So mostramos erro depois que o usuario saiu do campo (touched). Acusar erro
    // enquanto ele ainda esta digitando o e-mail e hostil.
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
