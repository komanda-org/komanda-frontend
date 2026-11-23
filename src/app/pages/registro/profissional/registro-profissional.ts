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
import { switchMap, tap } from 'rxjs';
import { CARGOS } from '../../../core/dados/opcoes';
import { HABILIDADES } from '../../../core/dados/opcoes';
import {
  aplicarConflito,
  aplicarErrosDeValidacao,
} from '../../../core/http/aplicar-erro-servidor';
import { traduzirConflito } from '../../../core/http/traduzir-conflito';
import { homeFor } from '../../../core/guards/role.guard';
import { isApiError } from '../../../core/models/api-error.model';
import { ProfessionalPreferences } from '../../../core/models/professional-preferences.model';
import {
  ExperiencePayload,
  ProfessionalProfile,
  UpdateProfilePayload,
  Mobility,
  WorkModel,
  requireProfessional,
} from '../../../core/models/profile.model';
import { RegistrarProfissionalPayload } from '../../../core/models/registro.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfessionalPreferencesService } from '../../../core/services/professional-preferences.service';
import { ProfileService } from '../../../core/services/profile.service';
import { MOBILITIES, mobilityLabel } from '../../../features/profile/profile-labels';
import { RegistroService } from '../../../core/services/registro.service';
import { mascararCep } from '../../../core/utils/mascaras';
import {
  cepValido,
  confirmacaoIgual,
  itensAteTamanho,
  minimoAparado,
  naoApenasEspacos,
  obrigatorioTrue,
  urlValida,
} from '../../../core/validators/validadores';
import { Campo } from '../../../shared/ui/campo';
import { EstadoCampoDirective } from '../../../shared/ui/estado-campo.directive';
import { ForcaSenha } from '../../../shared/ui/forca-senha';
import { PreviaImagem } from '../../../shared/ui/previa-imagem';
import { SeletorMesAno } from '../../../shared/ui/seletor-mes-ano';
import { Tags } from '../../../shared/ui/tags';
import { PainelCadastro } from '../../../shared/ui/painel-cadastro';

/** Os nomes dos controls, para o TypeScript conferir a lista de etapas. */
type CampoProfissional =
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'fullName'
  | 'mainRole'
  | 'contractType'
  | 'interestedRoles'
  | 'experienceSummary'
  | 'workPlace'
  | 'role'
  | 'startDate'
  | 'endDate'
  | 'currentJob'
  | 'experienceDescription'
  | 'skills'
  | 'profilePhoto'
  | 'neighborhood'
  | 'zipCode'
  | 'mobility'
  | 'acceptedTerms';

/**
 * Cadastro do profissional em 3 etapas.
 *
 * Um unico FormGroup com todos os campos e uma tabela dizendo quem pertence a
 * cada etapa: avancar valida so a etapa atual e voltar nao perde o digitado.
 */
@Component({
  selector: 'app-registro-profissional',
  imports: [
    ReactiveFormsModule,
    PainelCadastro,
    Campo,
    EstadoCampoDirective,
    Tags,
    PreviaImagem,
    ForcaSenha,
    SeletorMesAno,
  ],
  templateUrl: './registro-profissional.html',
  styleUrls: ['./registro-profissional.scss'],
})
export class RegistroProfissional {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly servico = inject(RegistroService);
  private readonly professionalPreferencesService = inject(ProfessionalPreferencesService);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  protected readonly cargos = CARGOS;
  protected readonly habilidades = HABILIDADES;
  protected readonly contractTypes = ['CLT', 'PJ', 'Freelancer'] as const;
  protected readonly mobilities = MOBILITIES;
  protected readonly mobilityLabel = mobilityLabel;
  protected readonly totalDeEtapas = 3;

  protected readonly etapa = signal(1);
  protected readonly enviando = signal(false);
  protected readonly mostrarSenha = signal(false);
  protected readonly erroGeral = signal<string | null>(null);
  protected readonly errosDetalhados = signal<string[]>([]);

  private readonly tituloEtapa = viewChild<ElementRef<HTMLElement>>('tituloEtapa');

  protected readonly ultimaEtapa = computed(() => this.etapa() === this.totalDeEtapas);


  /**
   * `NonNullableFormBuilder`: o tipo de cada control vira `string` (e nao
   * `string | null`), eliminando checagens de null ao montar o payload.
   * Validar aqui nao substitui o back — so evita uma ida a rede previsivel.
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
    confirmPassword: this.fb.control('', [
      Validators.required,
      confirmacaoIgual('password'),
    ]),
    fullName: this.fb.control('', [
      Validators.required,
      // minimoAparado, nao Validators.minLength: o payload envia fullName.trim().
      minimoAparado(3),
      Validators.maxLength(100),
      naoApenasEspacos(),
    ]),
    mainRole: this.fb.control('', [
      Validators.required,
      // Espelha o @Matches(/\S/) do DTO: required sozinho deixaria passar "   ".
      naoApenasEspacos(),
      Validators.maxLength(100),
    ]),
    contractType: this.fb.control<string>('', [
      Validators.required,
    ]),
    interestedRoles: this.fb.control<string[]>([], [itensAteTamanho(50)]),
    experienceSummary: this.fb.control('', [Validators.maxLength(1000)]),
    workPlace: this.fb.control('', [Validators.maxLength(100)]),
    role: this.fb.control('', [Validators.maxLength(100)]),
    startDate: this.fb.control(''),
    endDate: this.fb.control(''),
    currentJob: this.fb.control(false),
    experienceDescription: this.fb.control('', [Validators.maxLength(1000)]),
    skills: this.fb.control<string[]>([], [itensAteTamanho(50)]),
    profilePhoto: this.fb.control(''),
    neighborhood: this.fb.control('', [Validators.maxLength(100)]),
    zipCode: this.fb.control('', [Validators.required, cepValido()]),
    mobility: this.fb.control<Mobility | null>(null),
    acceptedTerms: this.fb.control(false, [obrigatorioTrue()]),
  });

  /** Qual campo pertence a qual etapa. O indice 0 e a etapa 1. */
  private readonly camposPorEtapa: readonly (readonly CampoProfissional[])[] = [
    ['profilePhoto', 'fullName', 'email', 'mainRole', 'contractType', 'password', 'confirmPassword', 'acceptedTerms'],
    ['experienceSummary', 'workPlace', 'role', 'startDate', 'endDate', 'currentJob', 'experienceDescription', 'skills', 'interestedRoles'],
    ['zipCode', 'neighborhood', 'mobility'],
  ];

  protected zipCodeError(): string | undefined {
    const errors = this.form.controls.zipCode.errors;
    if (errors?.['required']) {
      return 'Informe seu CEP';
    }
    if (errors?.['cep']) {
      return 'CEP inválido';
    }
    // Outros erros (ex.: mensagem do servidor) seguem a regra padrao do app-campo.
    return undefined;
  }

  protected aplicarCep(evento: Event): void {
    const alvo = evento.target as HTMLInputElement;
    const formatado = mascararCep(alvo.value);
    // Escrever de volta evita o cursor "pular" quando a mascara insere o hifen.
    alvo.value = formatado;
    this.form.controls.zipCode.setValue(formatado);
  }

  protected readonly skillsConcat = computed(() => this.experienciasAdicionadas().flatMap(e => e.skills));

  protected readonly novaExperienciaAtiva = signal(false);
  protected readonly proximoExperienciaId = signal(1);

  protected readonly experienciasAdicionadas = signal<Array<{
    id: number;
    workPlace: string;
    role: string;
    startDate: string;
    endDate: string;
    currentJob: boolean;
    experienceDescription: string;
    skills: string[];
  }>>([]);

  protected adicionarExperiencia(): void {
    this.novaExperienciaAtiva.set(true);
    this.resetarNovaExperiencia();
    this.reposicionar();
  }

  protected cancelarNovaExperiencia(): void {
    this.novaExperienciaAtiva.set(false);
    this.resetarNovaExperiencia();
  }

  protected novaExperienciaValida(): boolean {
    const w = this.form.controls.workPlace.value?.trim();
    const r = this.form.controls.role.value?.trim();
    const s = this.form.controls.startDate.value?.trim();
    return !!w && !!r && !!s;
  }

  protected salvarNovaExperiencia(): void {
    if (!this.novaExperienciaValida()) return;

    const id = this.proximoExperienciaId();
    this.experienciasAdicionadas.update(arr => [...arr, {
      id,
      workPlace: this.form.controls.workPlace.value.trim(),
      role: this.form.controls.role.value.trim(),
      startDate: this.form.controls.startDate.value.trim(),
      endDate: this.form.controls.endDate.value.trim(),
      currentJob: this.form.controls.currentJob.value,
      experienceDescription: this.form.controls.experienceDescription.value.trim(),
      skills: this.form.controls.skills.value,
    }]);
    this.proximoExperienciaId.set(id + 1);
    this.novaExperienciaAtiva.set(false);
    this.resetarNovaExperiencia();
    this.sincronizarCamposAPI();
  }

  protected removerExperiencia(id: number): void {
    this.experienciasAdicionadas.update(arr => arr.filter(e => e.id !== id));
    this.sincronizarCamposAPI();
  }

  protected formatarPeriodo(inicio: string, fim: string, atual: boolean): string {
    if (!inicio) return '';
    const formatar = (data: string) => {
      if (!data) return '';
      const [mes, ano] = data.split('/');
      return `${mes}/${ano}`;
    };
    const ini = formatar(inicio);
    if (atual || !fim) return `${ini} — Presente`;
    return `${ini} — ${formatar(fim)}`;
  }

  protected toggleAtual(evento: Event): void {
    const checkbox = evento.target as HTMLInputElement;
    this.form.controls.currentJob.setValue(checkbox.checked);
    if (checkbox.checked) {
      this.form.controls.endDate.setValue('');
    }
  }

  private resetarNovaExperiencia(): void {
    this.form.controls.workPlace.setValue('');
    this.form.controls.role.setValue('');
    this.form.controls.startDate.setValue('');
    this.form.controls.endDate.setValue('');
    this.form.controls.currentJob.setValue(false);
    this.form.controls.experienceDescription.setValue('');
    this.form.controls.skills.setValue([]);
  }

  /** Sincroniza experiências estruturadas para os campos que a API aceita hoje. */
  private sincronizarCamposAPI(): void {
    // interestedRoles: mergeia skills + interestedRoles originais
    const skillsUnicas = [...new Set(this.skillsConcat())];
    const rolesOriginais = this.form.controls.interestedRoles.value;
    this.form.controls.interestedRoles.setValue([...new Set([...rolesOriginais, ...skillsUnicas])]);
  }

  protected avancar(): void {
    if (this.enviando()) {
      return;
    }

    // Sem isto, campo nunca tocado seria invalido mas nao mostraria erro.
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
   * Ao trocar de etapa: volta ao topo e foca o titulo novo — sem o foco, quem
   * usa leitor de tela continuaria no botao da etapa anterior. O `setTimeout`
   * espera o Angular pintar; `document.defaultView` porque nao ha `window`
   * global no SSR.
   */
  private reposicionar(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => this.tituloEtapa()?.nativeElement.focus(), 0);
  }

  private enviar(): void {
    this.enviando.set(true);
    this.limparErro();

    const { email, password } = this.form.getRawValue();
    let accountCreated = false;

    // POST /professionals nao aceita trajetoria nem disponibilidade: entramos na
    // conta recem-criada e gravamos esses dados pelo PUT /users/me.
    this.servico
      .registrarProfissional(this.montarPayload())
      .pipe(
        tap(() => {
          accountCreated = true;
          this.professionalPreferencesService.saveForEmail(email, this.montarPreferencias());
        }),
        switchMap(() => this.authService.login({ email: email.trim(), password })),
        switchMap(() => this.profileService.getMe()),
        switchMap((me) =>
          this.profileService.updateMe(this.buildProfileUpdate(requireProfessional(me))),
        ),
        // Cancela a inscricao se o componente for destruido no meio da requisicao.
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigate([homeFor('PROFISSIONAL')]),
        error: (erro: unknown) => {
          if (!accountCreated) {
            this.tratarErro(erro);
            return;
          }
          void this.router.navigate(['/login'], {
            // `state` do Router: memoria pura, some no F5 e funciona no SSR.
            state: {
              mensagem:
                'Conta criada! Entre e confira sua trajetória e disponibilidade em "Editar perfil".',
            },
          });
        },
      });
  }

  private buildProfileUpdate(profile: ProfessionalProfile): UpdateProfilePayload {
    const experiences = this.experienciasAdicionadas();
    const skills = experiences.flatMap((experience) => experience.skills);
    return {
      fullName: profile.fullName,
      mainRole: profile.mainRole,
      profilePhoto: profile.profilePhoto,
      experienceSummary: profile.experienceSummary,
      neighborhood: profile.neighborhood,
      city: profile.city,
      state: profile.state,
      specialties: [...new Set([...profile.specialties, ...skills])],
      workModels: toWorkModels(this.form.controls.contractType.value),
      mobility: this.form.controls.mobility.value,
      experiences: experiences.map(
        (experience): ExperiencePayload => ({
          company: experience.workPlace,
          role: experience.role,
          startDate: monthYearToIsoDate(experience.startDate),
          endDate:
            experience.currentJob || !experience.endDate
              ? null
              : monthYearToIsoDate(experience.endDate),
          description: experience.experienceDescription || null,
        }),
      ),
    };
  }

  private tratarErro(erro: unknown): void {
    this.enviando.set(false);

    // Se nao e ApiError, nao passou pelo interceptor: erro nosso, nao da rede.
    if (!isApiError(erro)) {
      this.erroGeral.set('Algo deu errado ao criar a conta. Tente novamente.');
      return;
    }

    if (erro.status === 409) {
      const conflito = traduzirConflito(erro);
      this.erroGeral.set(conflito.mensagem);

      // O erro aparece tambem NO campo, nao so no banner.
      aplicarConflito(this.form, conflito.campo);

      // O campo recusado (email) fica na etapa 1: sem voltar, a pessoa le o
      // erro olhando para CEP e bairro, sem ter como corrigir.
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

  /**
   * Leva o usuario ate a etapa que contem o campo recusado. O `as readonly
   * string[]` alarga o tipo porque `campo` pode ser 'cnpj', que nao existe
   * aqui; -1 do `findIndex` ja responde "este form nao tem esse campo".
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
   * Campo opcional em branco NAO vai no payload: `neighborhood: ''` faria o
   * servidor validar a string vazia e falhar — omitir a chave e diferente de
   * manda-la vazia. `password` e o unico sem `.trim()` (espaco vale em senha).
   *
   * TODO API: enviar contractType, confirmPassword e acceptedTerms quando o
   * back aceitar; hoje o `forbidNonWhitelisted` recusa campos fora do DTO.
   */
  private montarPayload(): RegistrarProfissionalPayload {
    const valores = this.form.getRawValue();

    const payload: RegistrarProfissionalPayload = {
      email: valores.email.trim(),
      password: valores.password,
      fullName: valores.fullName.trim(),
      mainRole: valores.mainRole.trim(),
      zipCode: valores.zipCode,
    };

    if (valores.interestedRoles.length > 0) {
      payload.interestedRoles = valores.interestedRoles;
    }

    const resumo = valores.experienceSummary.trim();
    if (resumo) {
      payload.experienceSummary = resumo;
    }

    // TODO API: profilePhoto vem como data URL (upload de arquivo) e o back so
    // aceita URL; omitimos ate existir endpoint de upload multipart.

    const bairro = valores.neighborhood.trim();
    if (bairro) {
      payload.neighborhood = bairro;
    }

    return payload;
  }

  private montarPreferencias(): ProfessionalPreferences {
    const values = this.form.getRawValue();
    return {
      mainRole: values.mainRole.trim(),
      interestedRoles: values.interestedRoles,
      contractType: values.contractType as ProfessionalPreferences['contractType'],
    };
  }
}

/** "MM/AAAA" do seletor de mes vira a data ISO que a API espera. */
function monthYearToIsoDate(monthYear: string): string {
  const [month, year] = monthYear.split('/');
  return `${year}-${month.padStart(2, '0')}-01`;
}

function toWorkModels(contractType: string): WorkModel[] {
  const normalized = contractType.toUpperCase();
  return normalized === 'CLT' || normalized === 'PJ' || normalized === 'FREELANCER'
    ? [normalized]
    : [];
}
