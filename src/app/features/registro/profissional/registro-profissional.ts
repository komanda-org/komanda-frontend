import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CARGOS } from '../../../core/dados/opcoes';
import { traduzirConflito } from '../../../core/http/traduzir-conflito';
import { ehErroApi } from '../../../core/models/erro-api.model';
import { RegistrarProfissionalPayload } from '../../../core/models/registro.model';
import { RegistroService } from '../../../core/services/registro.service';
import { mascararCep } from '../../../core/utils/mascaras';
import {
  cepValido,
  itensAteTamanho,
  minimoAparado,
  naoApenasEspacos,
  urlValida,
} from '../../../core/validators/validadores';
import { Campo } from '../../../shared/ui/campo';
import { EstadoCampoDirective } from '../../../shared/ui/estado-campo.directive';
import { ForcaSenha } from '../../../shared/ui/forca-senha';
import { Moldura } from '../../../shared/ui/moldura';
import { PreviaImagem } from '../../../shared/ui/previa-imagem';
import { Tags } from '../../../shared/ui/tags';
import { TopoEtapa } from '../../../shared/ui/topo-etapa';

/** Os nomes dos controls, para o TypeScript conferir a lista de etapas. */
type CampoProfissional =
  | 'email'
  | 'password'
  | 'fullName'
  | 'mainRole'
  | 'interestedRoles'
  | 'experienceSummary'
  | 'profilePhoto'
  | 'neighborhood'
  | 'zipCode';

/**
 * Cadastro do profissional em 3 etapas.
 *
 * CONCEITO: wizard com um formulario so
 * Existe UM FormGroup com todos os campos, e uma tabela dizendo quais campos
 * pertencem a cada etapa. Avancar = validar apenas os campos daquela etapa.
 *
 * Por que nao um formulario por etapa? Porque o payload final precisa de tudo
 * junto, e porque voltar uma etapa nao pode perder o que ja foi digitado. Com
 * um grupo unico, o estado sobrevive a navegacao entre etapas de graca — os
 * campos apenas deixam de ser exibidos.
 */
@Component({
  selector: 'app-registro-profissional',
  imports: [
    ReactiveFormsModule,
    TopoEtapa,
    Moldura,
    Campo,
    EstadoCampoDirective,
    Tags,
    PreviaImagem,
    ForcaSenha,
  ],
  templateUrl: './registro-profissional.html',
  styleUrl: './registro-profissional.scss',
})
export class RegistroProfissional {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly servico = inject(RegistroService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  protected readonly cargos = CARGOS;
  protected readonly totalDeEtapas = 3;

  protected readonly etapa = signal(1);
  protected readonly enviando = signal(false);
  protected readonly mostrarSenha = signal(false);
  protected readonly erroGeral = signal<string | null>(null);
  protected readonly errosDetalhados = signal<string[]>([]);

  private readonly tituloEtapa = viewChild<ElementRef<HTMLElement>>('tituloEtapa');

  protected readonly ultimaEtapa = computed(() => this.etapa() === this.totalDeEtapas);

  /**
   * `NonNullableFormBuilder` em vez do FormBuilder comum: com ele o tipo de cada
   * control e `string` e nao `string | null`, o que elimina dezenas de checagens
   * de null ao montar o payload.
   *
   * Os validadores espelham a especificacao de POST /professionals. Validar aqui
   * nao substitui a validacao do servidor: serve para responder na hora e evitar
   * uma ida a rede que ja se sabe que vai falhar.
   */
  protected readonly form = this.fb.group({
    email: this.fb.control('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(255),
    ]),
    password: this.fb.control('', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(64),
    ]),
    fullName: this.fb.control('', [
      Validators.required,
      // minimoAparado, nao Validators.minLength: o payload envia fullName.trim(),
      // entao o minimo tem que ser medido no texto aparado (ver validadores.ts).
      minimoAparado(3),
      Validators.maxLength(100),
      naoApenasEspacos(),
    ]),
    mainRole: this.fb.control('', [
      Validators.required,
      // Espelha o @Matches(/\S/) do CreateProfessionalDto: required sozinho
      // deixaria passar "   ", que o trim do payload transforma em "" e o back
      // recusa com "Cargo principal nao pode estar vazio".
      naoApenasEspacos(),
      Validators.maxLength(100),
    ]),
    interestedRoles: this.fb.control<string[]>([], [itensAteTamanho(50)]),
    experienceSummary: this.fb.control('', [Validators.maxLength(1000)]),
    profilePhoto: this.fb.control('', [urlValida()]),
    neighborhood: this.fb.control('', [Validators.maxLength(100)]),
    zipCode: this.fb.control('', [cepValido()]),
  });

  /** Qual campo pertence a qual etapa. O indice 0 e a etapa 1. */
  private readonly camposPorEtapa: readonly (readonly CampoProfissional[])[] = [
    ['profilePhoto', 'fullName', 'email', 'mainRole', 'password'],
    ['experienceSummary', 'interestedRoles'],
    ['zipCode', 'neighborhood'],
  ];

  protected aplicarCep(evento: Event): void {
    const alvo = evento.target as HTMLInputElement;
    const formatado = mascararCep(alvo.value);
    // Escrever de volta no elemento evita o cursor "pular" quando a mascara
    // insere o hifen; depois sincronizamos o FormControl com o mesmo valor.
    alvo.value = formatado;
    this.form.controls.zipCode.setValue(formatado);
  }

  protected avancar(): void {
    if (this.enviando()) {
      return;
    }

    // Sem isto, um campo nunca tocado seria invalido mas nao mostraria erro:
    // a pessoa clicaria em "Continuar" e nada aconteceria na tela.
    const campos = this.camposPorEtapa[this.etapa() - 1] ?? [];
    campos.forEach((campo) => this.form.controls[campo].markAsTouched());

    const temErro = campos.some((campo) => this.form.controls[campo].invalid);
    if (temErro) {
      return;
    }

    if (this.ultimaEtapa()) {
      this.enviar();
      return;
    }

    this.etapa.update((atual) => atual + 1);
    this.reposicionar();
  }

  protected voltar(): void {
    if (this.etapa() === 1) {
      void this.router.navigate(['/registro']);
      return;
    }

    this.etapa.update((atual) => atual - 1);
    this.reposicionar();
  }

  /**
   * Ao trocar de etapa: volta ao topo e joga o foco no titulo novo.
   *
   * O foco importa tanto quanto a rolagem — sem ele, quem usa leitor de tela
   * continuaria no botao "Continuar" da etapa anterior, sem saber que a tela
   * inteira mudou. O `setTimeout` espera o Angular pintar a etapa nova.
   *
   * `document.defaultView` em vez de `window` porque no SSR nao existe `window`
   * global e o codigo quebraria ao ser avaliado no servidor.
   */
  private reposicionar(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => this.tituloEtapa()?.nativeElement.focus(), 0);
  }

  private enviar(): void {
    this.enviando.set(true);
    this.limparErro();

    this.servico
      .registrarProfissional(this.montarPayload())
      // Cancela a inscricao se o componente for destruido no meio da requisicao.
      // Sem isto, o callback mexeria em signals de um componente que ja morreu.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          void this.router.navigate(['/login'], {
            // A mensagem viaja pelo `state` do Router: memoria pura, some no F5
            // e funciona no SSR. localStorage nao existe no servidor.
            state: { mensagem: 'Conta criada com sucesso. Entre para continuar.' },
          }),
        error: (erro: unknown) => this.tratarErro(erro),
      });
  }

  private tratarErro(erro: unknown): void {
    this.enviando.set(false);

    // O interceptor normaliza tudo que vem da API. Se caiu aqui e nao e ErroApi,
    // foi erro de programacao nosso, nao da rede.
    if (!ehErroApi(erro)) {
      this.erroGeral.set('Algo deu errado ao criar a conta. Tente novamente.');
      return;
    }

    if (erro.status === 409) {
      const conflito = traduzirConflito(erro);
      this.erroGeral.set(conflito.mensagem);

      // O envio acontece na ultima etapa, mas o campo recusado (email) fica na
      // etapa 1. Sem voltar, a pessoa le "Email ja cadastrado" olhando para os
      // campos de CEP e bairro, sem ter como corrigir o que foi apontado.
      if (conflito.campo) {
        this.irParaEtapaDoCampo(conflito.campo);
      }
      return;
    }

    this.errosDetalhados.set(erro.mensagens);
    this.erroGeral.set(
      erro.mensagens.length > 1
        ? 'Confira os campos abaixo:'
        : (erro.mensagens[0] ?? 'Não foi possível criar a conta.'),
    );
  }

  /**
   * Leva o usuario ate a etapa que contem o campo recusado pelo servidor.
   *
   * O `as readonly string[]` alarga o tipo de propósito: `campo` pode ser
   * 'cnpj', que nao existe neste formulario, e sem o alargamento o TypeScript
   * recusaria a comparacao. Alargar (tipo estreito -> tipo largo) e seguro:
   * nao estamos prometendo nada que o valor nao cumpra, ao contrario de `any`,
   * que desligaria a checagem inteira. O findIndex devolvendo -1 ja e a
   * resposta correta para "este formulario nao tem esse campo".
   */
  private irParaEtapaDoCampo(campo: string): void {
    const indice = this.camposPorEtapa.findIndex((campos) =>
      (campos as readonly string[]).includes(campo),
    );

    if (indice === -1) {
      return;
    }

    this.etapa.set(indice + 1);
    this.reposicionar();
  }

  private limparErro(): void {
    this.erroGeral.set(null);
    this.errosDetalhados.set([]);
  }

  /**
   * Monta o corpo da requisicao.
   *
   * Regra importante: campo opcional em branco NAO vai no payload. Mandar
   * `neighborhood: ''` faria o servidor validar uma string vazia contra as
   * regras do campo — e falhar. Omitir a chave e diferente de manda-la vazia.
   *
   * `password` e o unico campo sem `.trim()`: espaco em senha e caractere
   * valido, e apara-lo mudaria silenciosamente a senha escolhida.
   */
  private montarPayload(): RegistrarProfissionalPayload {
    const valores = this.form.getRawValue();

    const payload: RegistrarProfissionalPayload = {
      email: valores.email.trim(),
      password: valores.password,
      fullName: valores.fullName.trim(),
      mainRole: valores.mainRole.trim(),
    };

    if (valores.interestedRoles.length > 0) {
      payload.interestedRoles = valores.interestedRoles;
    }

    const resumo = valores.experienceSummary.trim();
    if (resumo) {
      payload.experienceSummary = resumo;
    }

    const foto = valores.profilePhoto.trim();
    if (foto) {
      payload.profilePhoto = foto;
    }

    const bairro = valores.neighborhood.trim();
    if (bairro) {
      payload.neighborhood = bairro;
    }

    if (valores.zipCode) {
      payload.zipCode = valores.zipCode;
    }

    return payload;
  }
}
