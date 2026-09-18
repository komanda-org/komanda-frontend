import { Component, input } from '@angular/core';

/**
 * A MOLDURA de pagina de todas as telas do fluxo de entrada.
 *
 * Ela existe para resolver um problema de DESKTOP: um formulario tem largura
 * confortavel de leitura por volta de 30rem, e alarga-lo ate 1400px so pioraria
 * a usabilidade. Entao, em vez de esticar o formulario, a moldura ocupa o
 * espaco que sobra com uma vitrine da marca.
 *
 * O truque que a torna reaproveitavel e o <ng-content />: em vez de receber
 * DADOS por input, ela recebe HTML INTEIRO. Cada tela escreve o proprio
 * conteudo e o envolve com <app-moldura>. Nao ha uma linha de layout duplicada
 * entre as quatro telas, e mudar a vitrine muda todas de uma vez.
 *
 * Observacao de encapsulamento: o CSS deste componente NAO alcanca o conteudo
 * projetado — cada componente carrega o proprio estilo. Isso nao e um problema
 * aqui porque a `.tela` projetada e estilizada no global (styles/_ui.scss).
 */
@Component({
  selector: 'app-moldura',
  styleUrl: './moldura.scss',
  template: `
    <div class="moldura">
      <!--
        aside = conteudo tangente ao principal. E decorativo/institucional: some
        por completo abaixo de 1024px, onde nao ha espaco para ele e onde a
        pessoa esta focada em preencher o formulario.
      -->
      <aside class="vitrine">
        <div class="vitrine__conteudo">
          <p class="vitrine__marca">Komanda</p>

          <p class="vitrine__frase">{{ frase() }}</p>

          <ul class="vitrine__lista">
            @for (item of itens(); track item) {
              <li class="vitrine__item">{{ item }}</li>
            }
          </ul>
        </div>

        <p class="vitrine__rodape">Feito para quem vive de cozinha e salao.</p>
      </aside>

      <!--
        O buraco por onde a tela passa. <ng-content /> nao gera elemento nenhum
        no DOM: quem vira a segunda coluna do grid e a propria .tela projetada.
      -->
      <ng-content />
    </div>
  `,
})
export class Moldura {
  /** Frase de destaque da vitrine. Tem padrao, entao nenhuma tela e obrigada a passar. */
  readonly frase = input('A cozinha certa para o seu talento.');

  /**
   * `input<string[]>([...])` — o array e o valor padrao, e o TypeScript infere
   * `string[]` dele. Nao precisa de generic explicito nem de `any`.
   */
  readonly itens = input<string[]>([
    'Vagas de restaurantes verificados',
    'Seu perfil profissional em um lugar so',
    'Cadastro em menos de 2 minutos',
  ]);
}
