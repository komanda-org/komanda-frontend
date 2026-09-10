import { Directive, ElementRef, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Liga o estado do FormControl ao que o input mostra e ao que o leitor de tela anuncia.
 *
 * Sem isto, cada um dos ~19 campos das duas comandas precisaria repetir no HTML:
 *   [class.entrada--invalido]="form.controls.email.touched && form.controls.email.invalid"
 *   [attr.aria-invalid]="..."
 *   [attr.aria-describedby]="... ? 'email-erro' : null"
 *
 * O seletor casa com qualquer input/textarea/select que use formControlName, entao
 * a diretiva se aplica sozinha — basta importa-la no componente. Ninguem precisa
 * lembrar de escrever nada em campo nenhum.
 *
 * `aria-invalid` faz o leitor de tela anunciar "invalido" ao entrar no campo, e
 * `aria-describedby` faz ele LER a mensagem de erro. A borda vermelha sozinha
 * nao comunica nada para quem nao enxerga.
 */
@Directive({
  selector:
    'input[formControlName], textarea[formControlName], select[formControlName]',
  host: {
    '[class.entrada--invalido]': 'invalido()',
    '[attr.aria-invalid]': 'invalido() ? "true" : null',
    '[attr.aria-describedby]': 'descricao()',
  },
})
export class EstadoCampoDirective {
  // `self: true` = pega o NgControl deste mesmo elemento, nao de um ancestral.
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  protected invalido(): boolean {
    const controle = this.ngControl;
    return !!controle && !!controle.invalid && !!controle.touched;
  }

  /**
   * Aponta para o <span> de erro renderizado pelo app-campo, que usa o id
   * `<para>-erro`. Como o id do input e sempre igual ao `para` do campo, os
   * dois se encontram sem configuracao manual.
   */
  protected descricao(): string | null {
    const id = this.elemento.nativeElement.id;
    return this.invalido() && id ? `${id}-erro` : null;
  }
}
