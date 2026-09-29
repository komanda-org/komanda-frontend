import { Component, input } from '@angular/core';

/**
 * A MOLDURA de pagina de todas as telas do fluxo de entrada: em vez de
 * esticar o formulario ate 1400px (leitura comeca a sofrer em volta de
 * 30rem), o espaco que sobra vira uma vitrine da marca.
 *
 * Recebe HTML inteiro via `<ng-content />`, nao dados: cada tela envolve o
 * proprio conteudo e nao ha layout duplicado. O CSS nao alcanca o conteudo
 * projetado — tudo que a `.tela` precisa esta no global (styles/_ui.scss).
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
      <aside class="vitrine" [class.vitrine--logo]="marcaGrande()">
        @if (marcaGrande()) {
          <!--
            Variante logo centralizado (tela de escolha de perfil no Figma):
            marca grande + tagline, sem headline nem bullets.
          -->
          <div class="vitrine__logo-wrap">
            <p class="vitrine__logo">Komanda</p>
            <p class="vitrine__tagline">{{ frase() }}</p>
          </div>

          <p class="vitrine__rodape">POLÍTICA DE PRIVACIDADE · LGPD</p>
        } @else {
          <div class="vitrine__conteudo">
            <p class="vitrine__marca">Komanda</p>

            <p class="vitrine__frase">{{ frase() }}</p>

            <ul class="vitrine__lista">
              @for (item of itens(); track item) {
                <li class="vitrine__item">{{ item }}</li>
              }
            </ul>
          </div>

          <p class="vitrine__rodape">Feito para quem vive de cozinha e salão.</p>
        }
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

  /** Vitrine em modo logo centralizado (escolha de perfil). */
  readonly marcaGrande = input(false);

  /** `input<string[]>([...])`: o array e o valor padrao, o tipo vem dele. */
  readonly itens = input<string[]>([
    'Vagas de restaurantes verificados',
    'Seu perfil profissional em um lugar so',
    'Cadastro em menos de 2 minutos',
  ]);
}
