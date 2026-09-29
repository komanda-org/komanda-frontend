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
import { ehErroApi } from '../../../core/models/erro-api.model';
import { RegistrarRestaurantePayload } from '../../../core/models/registro.model';
import { RegistroService } from '../../../core/services/registro.service';
import { mascararCep, mascararCnpj, mascararTelefone } from '../../../core/utils/mascaras';
import {
  cepValido,
  cnpjValido,
  minimoAparado,
} from '../../../core/validators/validadores';
import { Campo } from '../../../shared/ui/campo';
import { EstadoCampoDirective } from '../../../shared/ui/estado-campo.directive';
import { ForcaSenha } from '../../../shared/ui/forca-senha';
import { Moldura } from '../../../shared/ui/moldura';
import { PreviaImagem } from '../../../shared/ui/previa-imagem';
import { TopoEtapa } from '../../../shared/ui/topo-etapa';

type CampoRestaurante =
  | 'email'
  | 'password'
  | 'phone'
  | 'restaurantName'
  | 'cnpj'
  | 'cuisineType'
  | 'description'
  | 'address'
  | 'zipCode'
  | 'logoUrl';

/**
 * Cadastro do restaurante em 2 etapas, na mesma arquitetura do profissional.
 *
 * A diferenca esta no CNPJ: unico campo com validacao de ALGORITMO (e nao so de
 * formato) — "11.111.111/1111-11" tem cara de CNPJ e mesmo assim e invalido.
 */
@Component({
  selector: 'app-registro-restaurante',
  imports: [
    ReactiveFormsModule,
    TopoEtapa,
    Moldura,
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

  /** Frase da vitrine por etapa (aproximacao — copy final pendente de UX). */
  protected readonly fraseVitrine = computed(
    () =>
      (['A equipe ideal para a sua casa.', 'Mostre sua casa aos candidatos.'] as const)[
        this.etapa() - 1
      ] ?? 'A equipe ideal para a sua casa.',
  );

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

  private readonly camposPorEtapa: readonly (readonly CampoRestaurante[])[] = [
    ['email', 'phone', 'password'],
    ['logoUrl', 'restaurantName', 'cnpj', 'cuisineType', 'address', 'zipCode', 'description'],
  ];

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

    if (!ehErroApi(erro)) {
      this.erroGeral.set('Algo deu errado ao criar a conta. Tente novamente.');
      return;
    }

    if (erro.status === 409) {
      const conflito = traduzirConflito(erro);
      this.erroGeral.set(conflito.mensagem);

      // O erro aparece tambem NO campo, nao so no banner.
      aplicarConflito(this.form, conflito.campo);

      // 'email' esta na etapa 1 e 'cnpj' na 2: o conflito de email exige
      // voltar uma tela, o de CNPJ so rola a pagina ate o banner.
      if (conflito.campo) {
        this.irParaEtapaDoCampo(conflito.campo);
      }
      return;
    }

    // 400: cada mensagem vira erro do proprio campo; o banner fica com o resto.
    const restantes = aplicarErrosDeValidacao(this.form, erro.mensagens);
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
   * Todos os campos menos `logoUrl` sao obrigatorios. O CNPJ vai MASCARADO
   * (XX.XXX.XXX/XXXX-XX), formato que a especificacao da rota descreve.
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
