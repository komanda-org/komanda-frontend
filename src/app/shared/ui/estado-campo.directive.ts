import { Directive, ElementRef, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Liga o estado do FormControl ao que o input mostra e ao que o leitor de tela
 * anuncia — sem ela, cada um dos ~19 campos teria de repetir `touched &&
 * invalid`, `aria-invalid` e `aria-describedby` no HTML.
 *
 * Casa com qualquer input/textarea/select que use `formControlName`, entao
 * basta importa-la: a borda vermelha sozinha nao comunica nada para quem nao
 * enxerga, o `aria-invalid` anuncia e o `aria-describedby` faz ler o erro.
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

  /** Aponta para o span de erro do app-campo (id `<para>-erro`). */
  protected descricao(): string | null {
    const id = this.elemento.nativeElement.id;
    return this.invalido() && id ? `${id}-erro` : null;
  }
}
