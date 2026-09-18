import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Moldura } from '../../shared/ui/moldura';
import { TopoEtapa } from '../../shared/ui/topo-etapa';

/**
 * Destino do redirecionamento apos o registro.
 *
 * ESCOPO: a task pedia a pagina de REGISTRO. Esta tela existe porque o fluxo
 * termina com "redireciona pro login com mensagem de sucesso" — sem uma rota
 * /login o redirect cairia em 404. Alem disso, o back-end ainda nao tem
 * nenhuma rota de autenticacao, entao construir o formulario de entrada agora
 * seria inventar um contrato.
 *
 * O que ela faz de verdade: recebe e exibe a mensagem de sucesso.
 */
@Component({
  selector: 'app-login',
  imports: [RouterLink, TopoEtapa, Moldura],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly router = inject(Router);

  protected readonly mensagem = signal<string | null>(null);

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

  protected voltarAoRegistro(): void {
    void this.router.navigate(['/registro']);
  }
}
