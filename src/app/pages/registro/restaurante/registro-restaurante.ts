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
import { TIPOS_DE_COZINHA } from '../../../core/dados/opcoes';
import {
  aplicarConflito,
  aplicarErrosDeValidacao,
} from '../../../core/http/aplicar-erro-servidor';
import { traduzirConflito } from '../../../core/http/traduzir-conflito';
import { isApiError } from '../../../core/models/api-error.model';
import { RegistrarRestaurantePayload } from '../../../core/models/registro.model';
import { RegistroService } from '../../../core/services/registro.service';
import { mascararCep, mascararCnpj, mascararTelefone } from '../../../core/utils/mascaras';
import {
  cepValido,
  cnpjValido,
  confirmacaoIgual,
  minimoAparado,
  obrigatorioTrue,
} from '../../../core/validators/validadores';
import { Campo } from '../../../shared/ui/campo';
import { EstadoCampoDirective } from '../../../shared/ui/estado-campo.directive';
import { ForcaSenha } from '../../../shared/ui/forca-senha';
import { PreviaImagem } from '../../../shared/ui/previa-imagem';
import { PainelCadastro } from '../../../shared/ui/painel-cadastro';

type CampoRestaurante =
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'acceptTerms'
  | 'phone'
  | 'restaurantName'
  | 'cnpj'
  | 'cuisineType'
  | 'description'
  | 'address'
  | 'zipCode'
  | 'logoUrl';

/**
 * Cadastro do restaurante em 2 etapas.
 *
 * A ETAPA 1 e a identidade da casa: CNPJ, nome fantasia, e-mail, cozinha,
 * senha, confirmacao e aceite dos termos. A etapa 2 fica com o que o
 * candidato le depois — contato, endereco e descricao.
 *
 * `confirmPassword` e `acceptTerms` existem so no formulario: nenhum dos dois
 * entra em `montarPayload()`, porque POST /restaurants nao os conhece. Confirmar
 * senha e aceitar termos sao decisoes da INTERFACE (evitar erro de digitacao,
 * registrar consentimento na tela), nao dados da conta.
 *
 * O CNPJ e o unico campo com validacao de ALGORITMO (e nao so de formato) —
 * "11.111.111/1111-11" tem cara de CNPJ e mesmo assim e invalido.
 */
@Component({
  selector: 'app-registro-restaurante',
  imports: [
    ReactiveFormsModule,
    PainelCadastro,
    Campo,
    EstadoCampoDirective,
    PreviaImagem,
    ForcaSenha,
  ],
  templateUrl: './registro-restaurante.html',
  styleUrl: './registro-restaurante.scss',
})
export class RegistroRestaurante {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly servico = inject(RegistroService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  protected readonly cozinhas = TIPOS_DE_COZINHA;
  protected readonly totalDeEtapas = 2;

  protected readonly etapa = signal(1);
  protected readonly enviando = signal(false);
  protected readonly mostrarSenha = signal(false);
  protected readonly erroGeral = signal<string | null>(null);
  protected readonly errosDetalhados = signal<string[]>([]);

  private readonly tituloEtapa = viewChild<ElementRef<HTMLElement>>('tituloEtapa');

  protected readonly ultimaEtapa = computed(() => this.etapa() === this.totalDeEtapas);


  /** Espelha a especificacao de POST /restaurants. */
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
    // Nao repete minLength: se a senha e curta, quem acusa e o campo `password`.
    // Duas mensagens iguais em campos vizinhos so fazem a pessoa ler duas vezes.
    confirmPassword: this.fb.control('', [
      Validators.required,
      confirmacaoIgual('password'),
    ]),
    // `false` como valor inicial, e nao `null`: o control e nao-nulavel, e um
    // checkbox desmarcado E false.
    acceptTerms: this.fb.control(false, [obrigatorioTrue()]),
    phone: this.fb.control('', [Validators.required, Validators.maxLength(20)]),
    // Nos quatro campos abaixo o minimo e `minimoAparado` e nao
    // `Validators.minLength`: montarPayload envia todos com .trim().
    restaurantName: this.fb.control('', [
      Validators.required,
      minimoAparado(3),
      Validators.maxLength(255),
    ]),
    cnpj: this.fb.control('', [Validators.required, cnpjValido()]),
    cuisineType: this.fb.control('', [
      Validators.required,
      minimoAparado(3),
      Validators.maxLength(100),
    ]),
    description: this.fb.control('', [
      Validators.required,
      minimoAparado(20),
      Validators.maxLength(1024),
    ]),
    address: this.fb.control('', [
      Validators.required,
      minimoAparado(5),
      Validators.maxLength(255),
    ]),
    zipCode: this.fb.control('', [
      Validators.required,
      Validators.maxLength(10),
      cepValido(),
    ]),
    logoUrl: this.fb.control(''),
  });

  /**
   * Quem pertence a qual etapa. O indice 0 e a etapa 1.
   *
   * A ORDEM aqui e a ordem do Figma, e nao por acaso: e ela que decide a ordem
   * em que os erros sao marcados ao clicar em CONTINUAR. `logoUrl` entra na
   * etapa 1 porque o upload vive no painel dela — nao tem validador, mas a
   * lista tambem serve de documentacao de onde cada campo mora.
   */
  private readonly camposPorEtapa: readonly (readonly CampoRestaurante[])[] = [
    [
      'logoUrl',
      'cnpj',
      'restaurantName',
      'email',
      'cuisineType',
      'password',
      'confirmPassword',
      'acceptTerms',
    ],
    ['phone', 'address', 'zipCode', 'description'],
  ];

  constructor() {
    // O `confirmacaoIgual` esta no control da CONFIRMACAO, e o Angular so roda
    // o validador de um control quando o valor DAQUELE control muda. Sem esta
    // linha, quem digita a confirmacao primeiro e a senha depois fica com o
    // erro "As senhas nao coincidem" preso na tela — o campo que mudou foi o
    // outro. `updateValueAndValidity` manda revalidar sem alterar o valor.
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.form.controls.confirmPassword.updateValueAndValidity());
  }

  protected aplicarCnpj(evento: Event): void {
    this.formatar(evento, mascararCnpj, 'cnpj');
  }

  protected aplicarCep(evento: Event): void {
    this.formatar(evento, mascararCep, 'zipCode');
  }

  protected aplicarTelefone(evento: Event): void {
    this.formatar(evento, mascararTelefone, 'phone');
  }

  /**
   * Aplica uma mascara e mantem elemento e FormControl com o mesmo valor. O
   * `campo` e tipado com as chaves reais do form: renomear `zipCode` vira erro
   * de compilacao aqui, nao mascara quebrada em silencio.
   */
  private formatar(
    evento: Event,
    mascara: (valor: string) => string,
    campo: 'cnpj' | 'zipCode' | 'phone',
  ): void {
    const alvo = evento.target as HTMLInputElement;
    const formatado = mascara(alvo.value);
    alvo.value = formatado;
    this.form.controls[campo].setValue(formatado);
  }

  protected avancar(): void {
    if (this.enviando()) {
      return;
    }

    const campos = this.camposPorEtapa[this.etapa() - 1] ?? [];
    campos.forEach((campo) => this.form.controls[campo].markAsTouched());

    if (campos.some((campo) => this.form.controls[campo].invalid)) {
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

  private reposicionar(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => this.tituloEtapa()?.nativeElement.focus(), 0);
  }

  private enviar(): void {
    this.enviando.set(true);
    this.limparErro();

    this.servico
      .registrarRestaurante(this.montarPayload())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          void this.router.navigate(['/login'], {
            state: { mensagem: 'Conta criada com sucesso. Entre para continuar.' },
          }),
        error: (erro: unknown) => this.tratarErro(erro),
      });
  }

  private tratarErro(erro: unknown): void {
    this.enviando.set(false);

    if (!isApiError(erro)) {
      this.erroGeral.set('Algo deu errado ao criar a conta. Tente novamente.');
      return;
    }

    if (erro.status === 409) {
      const conflito = traduzirConflito(erro);
      this.erroGeral.set(conflito.mensagem);

      // O erro aparece tambem NO campo, nao so no banner.
      aplicarConflito(this.form, conflito.campo);

      // Os dois campos que o back recusa com 409 — 'email' e 'cnpj' — moram
      // agora na etapa 1. Como o envio acontece na etapa 2, qualquer conflito
      // faz a pessoa VOLTAR uma tela; por isso a chamada continua aqui, e nao
      // vira um `if` para um caso so.
      if (conflito.campo) {
        this.irParaEtapaDoCampo(conflito.campo);
      }
      return;
    }

    // 400: cada mensagem vira erro do proprio campo; o banner fica com o resto.
    const restantes = aplicarErrosDeValidacao(this.form, erro.messages);
    this.errosDetalhados.set(restantes.length > 1 ? restantes : []);
    this.erroGeral.set(
      restantes.length > 1
        ? 'Confira os campos abaixo:'
        : (restantes[0] ?? 'Confira os campos destacados abaixo.'),
    );
  }

  /** Leva o usuario ate a etapa que contem o campo recusado pelo servidor. */
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
   * O payload e montado campo a campo, e nao com um spread do formulario, de
   * proposito: `confirmPassword`, `acceptTerms` e `logoUrl` NAO existem em
   * POST /restaurants, e um spread os mandaria junto na primeira distracao.
   *
   * O CNPJ vai MASCARADO (XX.XXX.XXX/XXXX-XX), formato que a rota descreve.
   */
  private montarPayload(): RegistrarRestaurantePayload {
    const valores = this.form.getRawValue();

    const payload: RegistrarRestaurantePayload = {
      email: valores.email.trim(),
      password: valores.password,
      restaurantName: valores.restaurantName.trim(),
      cnpj: valores.cnpj,
      cuisineType: valores.cuisineType.trim(),
      description: valores.description.trim(),
      address: valores.address.trim(),
      phone: valores.phone,
      zipCode: valores.zipCode,
    };

    // TODO API: logoUrl vem como data URL (upload de arquivo) e o back so
    // aceita URL; omitimos ate existir endpoint de upload multipart.

    return payload;
  }
}
