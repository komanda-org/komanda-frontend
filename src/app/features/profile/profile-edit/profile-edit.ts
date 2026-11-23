import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ApiError, isApiError } from '../../../core/models/api-error.model';
import {
  Experience,
  Mobility,
  ProfessionalProfile,
  UpdateProfilePayload,
  WorkModel,
  requireProfessional,
} from '../../../core/models/profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { apiMessage } from '../../../core/utils/describe-error';
import { initials } from '../../../core/utils/text';
import { PHOTO_ACCEPT, PhotoCropper, validatePhotoFile } from '../../../shared/ui/photo-cropper/photo-cropper';
import { describeError } from '../professional-profile/professional-profile';
import {
  BRAZIL_STATES,
  MOBILITIES,
  WORK_MODELS,
  mobilityLabel,
  workModelLabel,
} from '../profile-labels';

export const MAX_SPECIALTIES = 20;
export const MAX_SPECIALTY_LENGTH = 50;
export const MAX_EXPERIENCES = 30;

type LoadState = 'loading' | 'error' | 'ready';

export interface ExperienceFormValue {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface ProfileFormValue {
  fullName: string;
  mainRole: string;
  experienceSummary: string;
  neighborhood: string;
  city: string;
  state: string;
  specialties: string[];
  workModels: WorkModel[];
  mobility: Mobility | null;
  experiences: ExperienceFormValue[];
}

/** Obrigatorio e com tamanho medido sem os espacos das pontas ("   " nao vale). */
export function trimmedLength(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return { required: true };
    }
    return value.length < min || value.length > max ? { length: { min, max } } : null;
  };
}

// Datas YYYY-MM-DD comparam certo como texto, sem passar por Date/fuso.
export function experienceDates(group: AbstractControl): ValidationErrors | null {
  const { startDate, endDate, current } = group.value as ExperienceFormValue;
  if (current) {
    return null;
  }
  if (!endDate) {
    return { endRequired: true };
  }
  return startDate && endDate < startDate ? { endBeforeStart: true } : null;
}

const toDate = (value: string | null): string => (value ?? '').slice(0, 10);
const orNull = (value: string): string | null => value.trim() || null;

export function toFormValue(profile: ProfessionalProfile): ProfileFormValue {
  return {
    fullName: profile.fullName,
    mainRole: profile.mainRole,
    experienceSummary: profile.experienceSummary ?? '',
    neighborhood: profile.neighborhood ?? '',
    city: profile.city ?? '',
    state: (profile.state ?? '').toUpperCase(),
    specialties: [...profile.specialties],
    workModels: [...(profile.availability?.workModels ?? [])],
    mobility: profile.availability?.mobility ?? null,
    experiences: profile.experiences.map((experience: Experience) => ({
      company: experience.company,
      role: experience.role,
      startDate: toDate(experience.startDate),
      endDate: toDate(experience.endDate),
      current: experience.endDate === null,
      description: experience.description ?? '',
    })),
  };
}

export function toPayload(value: ProfileFormValue): UpdateProfilePayload {
  return {
    fullName: value.fullName.trim(),
    mainRole: value.mainRole.trim(),
    experienceSummary: orNull(value.experienceSummary),
    neighborhood: orNull(value.neighborhood),
    city: orNull(value.city),
    state: value.state || null,
    specialties: value.specialties,
    workModels: value.workModels,
    mobility: value.mobility,
    experiences: value.experiences.map((experience) => ({
      company: experience.company.trim(),
      role: experience.role.trim(),
      startDate: experience.startDate,
      endDate: experience.current ? null : experience.endDate,
      description: orNull(experience.description),
    })),
  };
}

export function describePhotoError(error: unknown): string {
  switch (isApiError(error) ? error.status : -1) {
    case 0:
      return 'Não conseguimos conectar. Verifique sua internet e tente de novo.';
    case 400:
      return apiMessage(error) ?? 'Não foi possível usar esta imagem. Tente outra.';
    case 413:
      return 'A imagem deve ter no máximo 5 MB. Escolha uma menor.';
    case 429:
      return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
    default:
      return 'Não foi possível salvar a foto. Tente de novo.';
  }
}

export function describeSaveError(error: unknown): string {
  const status = isApiError(error) ? error.status : -1;

  switch (status) {
    case 0:
      return 'Não conseguimos conectar. Verifique sua internet e tente de novo.';
    case 400:
      return (error as ApiError).fieldErrors
        ? 'Revise os campos destacados.'
        : humanizeFields((error as ApiError).messages[0] ?? 'Revise os dados e tente de novo.');
    case 403:
      return 'Esta conta não pode editar um perfil profissional. Entre com sua conta de profissional.';
    case 500:
    case 502:
    case 503:
      return 'Nosso serviço está instável agora. Suas alterações não foram salvas; tente de novo em instantes.';
    default:
      return 'Não foi possível salvar seu perfil. Tente de novo.';
  }
}

// A API cita os campos pelo nome tecnico ("endDate nao pode ser anterior a startDate").
function humanizeFields(message: string): string {
  return message.replace(/\bendDate\b/g, 'data de fim').replace(/\bstartDate\b/g, 'data de início');
}

const FIELD_MESSAGES: Record<string, Record<string, string>> = {
  fullName: {
    required: 'Informe seu nome.',
    length: 'O nome deve ter entre 3 e 100 caracteres.',
  },
  mainRole: {
    required: 'Informe sua função principal.',
    length: 'Use até 100 caracteres.',
  },
  experienceSummary: { maxlength: 'Use até 1000 caracteres.' },
  neighborhood: { maxlength: 'Use até 100 caracteres.' },
  city: { maxlength: 'Use até 100 caracteres.' },
  company: { required: 'Informe o restaurante ou empresa.', length: 'Use até 100 caracteres.' },
  role: { required: 'Informe o cargo.', length: 'Use até 100 caracteres.' },
  startDate: { required: 'Informe a data de início.' },
  endDate: {
    endRequired: 'Informe a data de fim ou marque “Emprego atual”.',
    endBeforeStart: 'A data de fim não pode ser anterior à de início.',
  },
  description: { maxlength: 'Use até 1000 caracteres.' },
};

@Component({
  selector: 'app-profile-edit',
  imports: [ReactiveFormsModule, RouterLink, PhotoCropper],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.scss',
})
export class ProfileEdit {
  private readonly service = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly states = BRAZIL_STATES;
  protected readonly workModels = WORK_MODELS;
  protected readonly mobilities = MOBILITIES;
  protected readonly workModelLabel = workModelLabel;
  protected readonly mobilityLabel = mobilityLabel;
  protected readonly maxExperiences = MAX_EXPERIENCES;
  protected readonly maxSpecialties = MAX_SPECIALTIES;

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly specialtyError = signal<string | null>(null);

  protected readonly photoAccept = PHOTO_ACCEPT;
  protected readonly initials = initials;
  protected readonly photoUrl = signal<string | null>(null);
  /** Arquivo escolhido e ainda nao recortado: enquanto existe, o editor de corte fica aberto. */
  protected readonly photoFile = signal<File | null>(null);
  protected readonly photoBusy = signal(false);
  protected readonly photoUploadError = signal<string | null>(null);
  protected readonly photoError = signal<string | null>(null);
  private readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');

  protected readonly specialtyDraft = this.fb.control('');

  protected readonly form = this.fb.group({
    fullName: ['', trimmedLength(3, 100)],
    mainRole: ['', trimmedLength(1, 100)],
    experienceSummary: ['', Validators.maxLength(1000)],
    neighborhood: ['', Validators.maxLength(100)],
    city: ['', Validators.maxLength(100)],
    state: [''],
    specialties: [[] as string[]],
    workModels: [[] as WorkModel[]],
    mobility: [null as Mobility | null],
    experiences: this.fb.array<FormGroup>([]),
  });

  constructor() {
    afterNextRender(() => this.load());
  }

  protected get experiences(): FormArray<FormGroup> {
    return this.form.controls.experiences;
  }

  protected load(): void {
    this.loadState.set('loading');
    this.service
      .getMe()
      .pipe(map(requireProfessional), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.fill(toFormValue(profile));
          this.photoUrl.set(profile.profilePhoto);
          this.loadState.set('ready');
        },
        error: (error: unknown) => {
          if (isApiError(error) && error.status === 401) {
            this.goToLogin();
            return;
          }
          this.loadError.set(describeError(error));
          this.loadState.set('error');
        },
      });
  }

  protected addSpecialty(event?: Event): void {
    event?.preventDefault();
    const value = this.specialtyDraft.value.trim();
    const list = this.form.controls.specialties.value;
    this.specialtyError.set(null);
    if (!value) {
      return;
    }
    if (value.length > MAX_SPECIALTY_LENGTH) {
      this.specialtyError.set(`Cada especialidade pode ter até ${MAX_SPECIALTY_LENGTH} caracteres.`);
      return;
    }
    if (list.length >= MAX_SPECIALTIES) {
      this.specialtyError.set(`Você pode cadastrar até ${MAX_SPECIALTIES} especialidades.`);
      return;
    }
    if (!list.some((item) => item.toLocaleLowerCase('pt-BR') === value.toLocaleLowerCase('pt-BR'))) {
      this.form.controls.specialties.setValue([...list, value]);
      this.form.markAsDirty();
    }
    this.specialtyDraft.setValue('');
  }

  protected removeSpecialty(specialty: string): void {
    const list = this.form.controls.specialties.value;
    this.form.controls.specialties.setValue(list.filter((item) => item !== specialty));
    this.specialtyError.set(null);
    this.form.markAsDirty();
  }

  protected toggleWorkModel(model: WorkModel): void {
    const list = this.form.controls.workModels.value;
    // Mantem a ordem fixa das opcoes, sem repeticao (a API recusa duplicados).
    const next = list.includes(model)
      ? list.filter((item) => item !== model)
      : WORK_MODELS.filter((item) => item === model || list.includes(item));
    this.form.controls.workModels.setValue(next);
    this.form.markAsDirty();
  }

  protected setMobility(mobility: Mobility | null): void {
    const current = this.form.controls.mobility.value;
    this.form.controls.mobility.setValue(current === mobility ? null : mobility);
    this.form.markAsDirty();
  }

  protected addExperience(): void {
    if (this.experiences.length >= MAX_EXPERIENCES) {
      return;
    }
    this.experiences.push(this.experienceGroup());
    this.form.markAsDirty();
  }

  protected removeExperience(index: number): void {
    this.experiences.removeAt(index);
    this.form.markAsDirty();
  }

  protected error(control: AbstractControl | null, field: string): string | null {
    if (!control || control.valid || !(control.touched || control.dirty)) {
      return null;
    }
    return this.messageFor(control.errors, field);
  }

  protected experienceError(index: number, field: keyof ExperienceFormValue): string | null {
    const group = this.experiences.at(index);
    const fieldMessage = this.error(group.get(field), field);
    if (fieldMessage || field !== 'endDate') {
      return fieldMessage;
    }
    const touched = group.get('endDate')?.touched || group.get('startDate')?.touched;
    return touched ? this.messageFor(group.errors, 'endDate') : null;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    this.saveError.set(null);
    if (this.form.invalid) {
      this.saveError.set('Revise os campos destacados.');
      return;
    }
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.service
      .updateMe(toPayload(this.form.getRawValue() as ProfileFormValue))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          void this.router.navigateByUrl('/perfil', { state: { notice: 'Perfil atualizado.' } });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          if (isApiError(error) && error.status === 401) {
            this.goToLogin();
            return;
          }
          if (isApiError(error) && error.fieldErrors) {
            this.applyServerErrors(error.fieldErrors);
          }
          this.saveError.set(describeSaveError(error));
        },
      });
  }

  private fill(value: ProfileFormValue): void {
    this.experiences.clear();
    for (const experience of value.experiences) {
      this.experiences.push(this.experienceGroup(experience));
    }
    this.form.reset({ ...value, experiences: value.experiences });
  }

  private experienceGroup(value?: ExperienceFormValue): FormGroup {
    return this.fb.group(
      {
        company: [value?.company ?? '', trimmedLength(1, 100)],
        role: [value?.role ?? '', trimmedLength(1, 100)],
        startDate: [value?.startDate ?? '', Validators.required],
        endDate: [value?.endDate ?? ''],
        current: [value?.current ?? false],
        description: [value?.description ?? '', Validators.maxLength(1000)],
      },
      { validators: experienceDates },
    );
  }

  private applyServerErrors(fieldErrors: Record<string, string>): void {
    for (const [path, message] of Object.entries(fieldErrors)) {
      const control = this.form.get(path);
      if (control) {
        control.setErrors({ ...control.errors, server: message });
        control.markAsTouched();
      }
    }
  }

  private messageFor(errors: ValidationErrors | null, field: string): string | null {
    if (!errors) {
      return null;
    }
    if (typeof errors['server'] === 'string') {
      return humanizeFields(errors['server']);
    }
    const messages = FIELD_MESSAGES[field] ?? {};
    const key = Object.keys(errors).find((name) => messages[name]);
    return key ? messages[key] : 'Revise este campo.';
  }

  protected choosePhoto(): void {
    this.photoInput()?.nativeElement.click();
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Sem limpar, escolher o mesmo arquivo de novo nao dispara `change`.
    input.value = '';
    if (!file) {
      return;
    }
    const problem = validatePhotoFile(file);
    this.photoError.set(problem);
    this.photoUploadError.set(null);
    this.photoFile.set(problem ? null : file);
  }

  protected cancelCrop(): void {
    this.photoFile.set(null);
    this.photoUploadError.set(null);
  }

  protected uploadPhoto(image: Blob): void {
    if (this.photoBusy()) {
      return;
    }
    this.photoBusy.set(true);
    this.photoUploadError.set(null);
    const extension = image.type === 'image/webp' ? 'webp' : 'jpg';
    this.service
      .uploadPhoto(image, `foto.${extension}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => {
          this.photoBusy.set(false);
          this.photoUrl.set(url);
          this.photoFile.set(null);
        },
        error: (error: unknown) => {
          this.photoBusy.set(false);
          if (isApiError(error) && error.status === 401) {
            this.goToLogin();
            return;
          }
          this.photoUploadError.set(describePhotoError(error));
        },
      });
  }

  protected removePhoto(): void {
    if (this.photoBusy()) {
      return;
    }
    this.photoBusy.set(true);
    this.photoError.set(null);
    this.service
      .removePhoto()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.photoBusy.set(false);
          this.photoUrl.set(null);
        },
        error: (error: unknown) => {
          this.photoBusy.set(false);
          if (isApiError(error) && error.status === 401) {
            this.goToLogin();
            return;
          }
          this.photoError.set(describePhotoError(error));
        },
      });
  }

  private goToLogin(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
