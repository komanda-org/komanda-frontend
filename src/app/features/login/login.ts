import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { mensagemDoErro } from '../../core/validators/mensagens-de-erro';
import { EstadoCampoDirective } from '../../shared/ui/estado-campo.directive';
import { Moldura } from '../../shared/ui/moldura';

/**
 * Tela de entrada.
 *
 * ESCOPO: o back-end ainda nao tem rota de autenticacao. O formulario existe
 * porque e a porta do produto — a tela precisa parecer e se comportar como uma
 * tela de login desde ja —, mas o envio NAO chama a API: inventar um contrato
 * aqui criaria codigo que teria de ser reescrito no dia em que a rota nascer.
 *
 * O que ela faz de verdade: valida o que foi digitado, exibe a mensagem de
 * sucesso vinda do cadastro e avisa, sem rodeios, que a entrada ainda nao
 * abriu. Quando /auth/login existir, so `entrar()` muda.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Moldura, EstadoCampoDirective],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  protected readonly mostrarSenha = signal(false);

  /** Mensagem de sucesso que chega do cadastro. */
  protected readonly mensagem = signal<string | null>(null);

  /** Resposta do proprio formulario enquanto nao ha API de autenticacao. */
  protected readonly nota = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required]),
  });

  constructor() {
    // `getCurrentNavigation()` so responde DURANTE a navegacao — por isso a
    // leitura acontece no construtor, e nao depois.
    //
    // Por que nao `history.state`? Porque no SSR nao existe `history`: o codigo
    // roda no Node antes de chegar ao browser e quebraria a renderizacao.
    const navegacao = this.router.getCurrentNavigation();
    const estado = navegacao?.extras.state as { mensagem?: string } | undefined;

    this.mensagem.set(estado?.mensagem ?? null);
  }

  /**
   * Metodo, e nao `computed()`: o estado de um FormControl (touched, errors)
   * nao e signal, entao `computed` nao perceberia a mudanca.
   */
  protected erro(campo: 'email' | 'password'): string | null {
    const controle = this.form.controls[campo];

    // Erro so depois da saida do campo: acusar enquanto digita e hostil.
    if (!controle.touched || controle.valid) {
      return null;
    }

    return mensagemDoErro(controle.errors, campo === 'email' ? 'E-mail' : 'Senha');
  }

  protected entrar(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.mensagem.set(null);
    this.nota.set('A entrada ainda não está liberada. Sua conta já existe e estará aqui assim que o login abrir.');
  }

  protected esqueciSenha(): void {
    this.mensagem.set(null);
    this.nota.set('A recuperação de senha ainda não está disponível.');
  }
}
