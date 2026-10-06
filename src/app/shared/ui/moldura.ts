import { Component, input } from '@angular/core';

/**
 * A MOLDURA das telas curtas do fluxo de entrada (entrar e escolher perfil).
 *
 * Em vez de esticar um formulario de dois campos ate 1400px — a leitura comeca
 * a sofrer em volta de 30rem —, o espaco que sobra vira a vitrine da marca.
 *
 * Recebe HTML inteiro via `<ng-content />`, nao dados: cada tela envolve o
 * proprio conteudo e nao ha layout duplicado. O CSS daqui nao alcanca o
 * conteudo projetado — tudo que a `.tela` precisa esta no global
 * (styles/_ui.scss).
 *
 * As telas de CADASTRO nao usam esta moldura: la a coluna da esquerda deixa de
 * ser vitrine e vira o painel da etapa (ver `PainelCadastro`).
 */
@Component({
  selector: 'app-moldura',
  styleUrl: './moldura.scss',
  template: `
    <div class="moldura">
      <!--
        aside = conteudo tangente ao principal. E institucional: some por
        completo abaixo de 1024px, onde nao ha espaco para ele e onde a pessoa
        esta focada em preencher o formulario.
      -->
      <aside class="vitrine">
        <div class="vitrine__lockup">
          <p class="vitrine__logo">Komanda</p>
          <p class="vitrine__tagline">{{ frase() }}</p>
        </div>

        <p class="vitrine__rodape">Política de privacidade · LGPD</p>
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
  /** Frase sob a marca. Tem padrao, entao nenhuma tela e obrigada a passar. */
  readonly frase = input('Vagas de gastronomia que combinam com você');
}
