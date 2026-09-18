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
import { traduzirConflito } from '../../../core/http/traduzir-conflito';
import { ehErroApi } from '../../../core/models/erro-api.model';
import { RegistrarRestaurantePayload } from '../../../core/models/registro.model';
import { RegistroService } from '../../../core/services/registro.service';
import { mascararCep, mascararCnpj, mascararTelefone } from '../../../core/utils/mascaras';
import { cepValido, cnpjValido, urlValida } from '../../../core/validators/validadores';
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
 * Cadastro do restaurante em 2 etapas.
 *
 * Mesma arquitetura do wizard do profissional: um FormGroup unico e uma tabela
 * dizendo quais campos pertencem a cada etapa.
 *
 * A diferenca real esta no CNPJ: e o unico campo com validacao de ALGORITMO e
 * nao so de formato. "11.111.111/1111-11" tem o formato certo e mesmo assim e
 * invalido — quem decide isso e a funcao pura em core/validators/cnpj.ts.
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
    restaurantName: this.fb.control('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(255),
    ]),
    cnpj: this.fb.control('', [Validators.required, cnpjValido()]),
    cuisineType: this.fb.control('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(100),
    ]),
    description: this.fb.control('', [
      Validators.required,
      Validators.minLength(20),
      Validators.maxLength(1024),
    ]),
    address: this.fb.control('', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(255),
    ]),
    zipCode: this.fb.control('', [
      Validators.required,
      Validators.maxLength(10),
      cepValido(),
    ]),
    logoUrl: this.fb.control('', [urlValida(), Validators.maxLength(2048)]),
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
   * Aplica uma mascara e mantem elemento e FormControl com o mesmo valor.
   *
   * `campo` e tipado com as chaves reais do form (e nao como `string`) — se
   * alguem renomear `zipCode`, o TypeScript acusa o erro aqui em vez de a
   * mascara simplesmente parar de funcionar em silencio.
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
      this.erroGeral.set(traduzirConflito(erro));
      return;
    }

    this.errosDetalhados.set(erro.mensagens);
    this.erroGeral.set(
      erro.mensagens.length > 1
        ? 'Confira os campos abaixo:'
        : (erro.mensagens[0] ?? 'Não foi possível criar a conta.'),
    );
  }

  private limparErro(): void {
    this.erroGeral.set(null);
    this.errosDetalhados.set([]);
  }

  /**
   * Aqui todos os campos menos `logoUrl` sao obrigatorios, entao o payload e
   * quase direto. O CNPJ vai MASCARADO (XX.XXX.XXX/XXXX-XX) porque e assim que
   * a especificacao da rota descreve o formato esperado.
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

    const logo = valores.logoUrl.trim();
    if (logo) {
      payload.logoUrl = logo;
    }

    return payload;
  }
}
