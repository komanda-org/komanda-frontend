import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { isApiError } from '../../../core/models/api-error.model';
import { RestaurantMe, UpdateRestaurantPayload, requireRestaurant } from '../../../core/models/profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiMessage } from '../../../core/utils/describe-error';
import { mascararCep, mascararTelefone } from '../../../core/utils/mascaras';
import { initials } from '../../../core/utils/text';
import { cepValido, minimoAparado } from '../../../core/validators/validadores';
import { PHOTO_ACCEPT, PhotoCropper, validatePhotoFile } from '../../../shared/ui/photo-cropper/photo-cropper';
import { describePhotoError } from '../../profile/profile-edit/profile-edit';

type LoadState = 'loading' | 'error' | 'ready';
type Field = keyof UpdateRestaurantPayload;

export const SAVED_TOAST = 'Perfil atualizado.';
export const DESCRIPTION_MAX = 1024;

export interface RestaurantFormValue {
  restaurantName: string;
  cuisineType: string;
  description: string;
  address: string;
  phone: string;
  zipCode: string;
}

export function toRestaurantForm(me: RestaurantMe): RestaurantFormValue {
  return {
    restaurantName: me.restaurantName,
    cuisineType: me.cuisineType,
    description: me.description,
    address: me.address,
    phone: mascararTelefone(me.phone),
    zipCode: me.zipCode ? mascararCep(me.zipCode) : '',
  };
}

export function toRestaurantPayload(value: RestaurantFormValue): UpdateRestaurantPayload {
  return {
    restaurantName: value.restaurantName.trim(),
    cuisineType: value.cuisineType.trim(),
    description: value.description.trim(),
    address: value.address.trim(),
    phone: value.phone.trim(),
    zipCode: value.zipCode.trim() || null,
  };
}

const FIELD_MESSAGES: Record<Field, Record<string, string>> = {
  restaurantName: { required: 'Informe o nome do restaurante.', minlength: 'Use pelo menos 3 caracteres.', maxlength: 'Use até 255 caracteres.' },
  cuisineType: { required: 'Informe o tipo de cozinha.', minlength: 'Use pelo menos 3 caracteres.', maxlength: 'Use até 100 caracteres.' },
  description: { required: 'Conte um pouco sobre o restaurante.', minlength: 'Use pelo menos 20 caracteres.', maxlength: `Use até ${DESCRIPTION_MAX} caracteres.` },
  address: { required: 'Informe o endereço.', minlength: 'Use pelo menos 5 caracteres.', maxlength: 'Use até 255 caracteres.' },
  phone: { required: 'Informe um telefone para contato.', maxlength: 'Use até 20 caracteres.' },
  zipCode: { cep: 'Informe o CEP no formato 00000-000.' },
};

export function describeRestaurantSaveError(error: unknown): string {
  switch (isApiError(error) ? error.status : -1) {
    case 0:
      return 'Não conseguimos conectar. Verifique sua internet e tente de novo.';
    case 400:
      return apiMessage(error) ?? 'Revise os campos destacados.';
    case 403:
      return 'Esta conta não pode editar um perfil de restaurante.';
    case 404:
      return 'Não encontramos o seu restaurante. Entre novamente e tente de novo.';
    case 500:
    case 502:
    case 503:
      return 'Nosso serviço está instável agora. Suas alterações não foram salvas; tente de novo em instantes.';
    default:
      return 'Não foi possível salvar o perfil. Tente de novo.';
  }
}

function describeLoadError(error: unknown): string {
  switch (isApiError(error) ? error.status : -1) {
    case 0:
      return 'Não conseguimos conectar. Verifique sua internet e tente de novo.';
    case 403:
      return 'Esta conta não é de restaurante.';
    default:
      return 'Não foi possível carregar o perfil. Tente de novo.';
  }
}

@Component({
  selector: 'app-restaurant-profile-edit',
  imports: [ReactiveFormsModule, RouterLink, PhotoCropper],
  templateUrl: './restaurant-profile-edit.html',
  styleUrl: './restaurant-profile-edit.scss',
})
export class RestaurantProfileEdit {
  private readonly service = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly descriptionMax = DESCRIPTION_MAX;
  protected readonly initials = initials;
  protected readonly photoAccept = PHOTO_ACCEPT;

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly loadError = signal('');
  protected readonly me = signal<RestaurantMe | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly logoUrl = signal<string | null>(null);
  /** Arquivo escolhido e ainda nao recortado: enquanto existe, o editor de corte fica aberto. */
  protected readonly logoFile = signal<File | null>(null);
  protected readonly logoBusy = signal(false);
  protected readonly logoUploadError = signal<string | null>(null);
  protected readonly logoError = signal<string | null>(null);
  private readonly logoInput = viewChild<ElementRef<HTMLInputElement>>('logoInput');

  protected readonly form = this.fb.group({
    restaurantName: ['', [Validators.required, minimoAparado(3), Validators.maxLength(255)]],
    cuisineType: ['', [Validators.required, minimoAparado(3), Validators.maxLength(100)]],
    description: ['', [Validators.required, minimoAparado(20), Validators.maxLength(DESCRIPTION_MAX)]],
    address: ['', [Validators.required, minimoAparado(5), Validators.maxLength(255)]],
    phone: ['', [Validators.required, Validators.maxLength(20)]],
    zipCode: ['', [Validators.maxLength(10), cepValido()]],
  });

  constructor() {
    afterNextRender(() => this.load());
  }

  protected profileLink(): string[] {
    const me = this.me();
    return me ? ['/restaurantes', me.id] : ['/dashboard'];
  }

  protected load(): void {
    this.loadState.set('loading');
    this.service
      .getMe()
      .pipe(map(requireRestaurant), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (me) => {
          this.me.set(me);
          this.logoUrl.set(me.logoUrl);
          this.form.reset(toRestaurantForm(me));
          this.loadState.set('ready');
        },
        error: (error: unknown) => {
          if (isApiError(error) && error.status === 401) {
            this.goToLogin();
            return;
          }
          this.loadError.set(describeLoadError(error));
          this.loadState.set('error');
        },
      });
  }

  protected maskPhone(event: Event): void {
    this.mask(event, mascararTelefone, 'phone');
  }

  protected maskZipCode(event: Event): void {
    this.mask(event, mascararCep, 'zipCode');
  }

  protected error(field: Field): string | null {
    const control: AbstractControl = this.form.controls[field];
    if (control.valid || !(control.touched || control.dirty) || !control.errors) {
      return null;
    }
    if (typeof control.errors['server'] === 'string') {
      return control.errors['server'];
    }
    const messages = FIELD_MESSAGES[field];
    const key = Object.keys(control.errors).find((name) => messages[name]);
    return key ? messages[key] : 'Revise este campo.';
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
      .updateRestaurant(toRestaurantPayload(this.form.getRawValue()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.form.markAsPristine();
          this.toast.show(SAVED_TOAST);
          void this.router.navigate(this.profileLink());
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
          this.saveError.set(describeRestaurantSaveError(error));
        },
      });
  }

  protected chooseLogo(): void {
    this.logoInput()?.nativeElement.click();
  }

  protected onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Sem limpar, escolher o mesmo arquivo de novo nao dispara `change`.
    input.value = '';
    if (!file) {
      return;
    }
    const problem = validatePhotoFile(file);
    this.logoError.set(problem);
    this.logoUploadError.set(null);
    this.logoFile.set(problem ? null : file);
  }

  protected cancelCrop(): void {
    this.logoFile.set(null);
    this.logoUploadError.set(null);
  }

  protected uploadLogo(image: Blob): void {
    if (this.logoBusy()) {
      return;
    }
    this.logoBusy.set(true);
    this.logoUploadError.set(null);
    const extension = image.type === 'image/webp' ? 'webp' : 'jpg';
    this.service
      .uploadPhoto(image, `logo.${extension}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => {
          this.logoBusy.set(false);
          this.logoUrl.set(url);
          this.logoFile.set(null);
        },
        error: (error: unknown) => {
          this.logoBusy.set(false);
          if (isApiError(error) && error.status === 401) {
            this.goToLogin();
            return;
          }
          this.logoUploadError.set(describePhotoError(error));
        },
      });
  }

  protected removeLogo(): void {
    if (this.logoBusy()) {
      return;
    }
    this.logoBusy.set(true);
    this.logoError.set(null);
    this.service
      .removePhoto()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.logoBusy.set(false);
          this.logoUrl.set(null);
        },
        error: (error: unknown) => {
          this.logoBusy.set(false);
          if (isApiError(error) && error.status === 401) {
            this.goToLogin();
            return;
          }
          this.logoError.set(describePhotoError(error));
        },
      });
  }

  private mask(event: Event, mask: (value: string) => string, field: 'phone' | 'zipCode'): void {
    const target = event.target as HTMLInputElement;
    const masked = mask(target.value);
    target.value = masked;
    this.form.controls[field].setValue(masked);
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

  private goToLogin(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
