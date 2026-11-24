import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { RestaurantMe } from '../../../core/models/profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PhotoCropper } from '../../../shared/ui/photo-cropper/photo-cropper';
import {
  RestaurantProfileEdit,
  SAVED_TOAST,
  describeRestaurantSaveError,
  toRestaurantForm,
  toRestaurantPayload,
} from './restaurant-profile-edit';

const ME: RestaurantMe = {
  role: 'RESTAURANTE',
  id: 'r1',
  email: 'contato@cantina.com',
  restaurantName: 'Cantina Bella',
  cnpj: '11.222.333/0001-81',
  cuisineType: 'Italiana',
  description: 'Cantina italiana tradicional com massas artesanais.',
  address: 'Rua das Flores, 123 - Centro',
  phone: '11987654321',
  zipCode: '01001000',
  logoUrl: null,
  averageRating: null,
  plan: 'FREE',
};

describe('RestaurantProfileEdit — pure functions', () => {
  it('masks phone and zip code coming from the API', () => {
    const value = toRestaurantForm(ME);
    expect(value.phone).toBe('(11) 98765-4321');
    expect(value.zipCode).toBe('01001-000');
    expect(toRestaurantForm({ ...ME, zipCode: null }).zipCode).toBe('');
  });

  it('trims the values and sends null for an empty zip code (itinerant restaurant)', () => {
    const payload = toRestaurantPayload({ ...toRestaurantForm(ME), restaurantName: '  Cantina  ', zipCode: ' ' });
    expect(payload).toEqual({
      restaurantName: 'Cantina',
      cuisineType: 'Italiana',
      description: 'Cantina italiana tradicional com massas artesanais.',
      address: 'Rua das Flores, 123 - Centro',
      phone: '(11) 98765-4321',
      zipCode: null,
    });
    expect('logoUrl' in payload).toBe(false);
  });

  it('never exposes the HTTP status in the save error', () => {
    const apiError = (status: number, messages: string[] = []) => ({ status, messages, fieldErrors: null });
    expect(describeRestaurantSaveError(apiError(0))).toContain('internet');
    expect(describeRestaurantSaveError(apiError(400, ['Telefone não pode ser vazio']))).toBe(
      'Telefone não pode ser vazio.',
    );
    expect(describeRestaurantSaveError(apiError(503))).not.toMatch(/503/);
  });
});

describe('RestaurantProfileEdit', () => {
  let fixture: ComponentFixture<RestaurantProfileEdit>;
  let http: HttpTestingController;
  let router: Router;
  const toast = { show: vi.fn() };
  const logout = vi.fn();
  const el = () => fixture.nativeElement as HTMLElement;
  const q = <T extends Element = HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`);

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(me: RestaurantMe = ME): Promise<void> {
    fixture = TestBed.createComponent(RestaurantProfileEdit);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne('/api/users/me').flush(me);
    await settle();
  }

  function type(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  function save(): void {
    q<HTMLFormElement>('restaurant-form')!.dispatchEvent(new Event('submit'));
  }

  beforeEach(() => {
    toast.show.mockReset();
    logout.mockReset();
    TestBed.configureTestingModule({
      imports: [RestaurantProfileEdit],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { logout, getUser: () => ({ id: 'r1', role: 'RESTAURANTE' }) } },
        { provide: ToastService, useValue: toast },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('fills the form with the GET data and shows CNPJ and e-mail as read-only', async () => {
    await render();

    expect(q<HTMLInputElement>('restaurantName-input')!.value).toBe('Cantina Bella');
    expect(q<HTMLInputElement>('phone-input')!.value).toBe('(11) 98765-4321');
    expect(q<HTMLInputElement>('zipCode-input')!.value).toBe('01001-000');
    expect(q('fixed-data')!.textContent).toContain('11.222.333/0001-81');
    expect(q('fixed-data')!.textContent).toContain('contato@cantina.com');
    expect(q('logo-initials')!.textContent?.trim()).toBe('CB');
  });

  it('saves with PUT, shows a toast and goes back to the public profile', async () => {
    await render();
    type(q<HTMLInputElement>('cuisineType-input')!, 'Italiana contemporânea');
    type(q<HTMLInputElement>('zipCode-input')!, '');

    save();
    await settle();
    expect(q('save-btn')!.textContent).toContain('Salvando');

    const request = http.expectOne({ method: 'PUT', url: '/api/users/me' });
    expect(request.request.body).toEqual({
      restaurantName: 'Cantina Bella',
      cuisineType: 'Italiana contemporânea',
      description: 'Cantina italiana tradicional com massas artesanais.',
      address: 'Rua das Flores, 123 - Centro',
      phone: '(11) 98765-4321',
      zipCode: null,
    });
    request.flush({ userId: 'r1', role: 'RESTAURANTE', profile: { ...request.request.body, logoUrl: null } });
    await settle();

    expect(toast.show).toHaveBeenCalledWith(SAVED_TOAST);
    expect(router.navigate).toHaveBeenCalledWith(['/restaurantes', 'r1']);
  });

  it('blocks the save with messages on the invalid fields', async () => {
    await render();
    type(q<HTMLTextAreaElement>('description-input')!, 'Curta');
    type(q<HTMLInputElement>('zipCode-input')!, '0100');

    save();
    await settle();

    http.expectNone({ method: 'PUT', url: '/api/users/me' });
    expect(q('description-error')!.textContent).toContain('pelo menos 20 caracteres');
    expect(q('zipCode-error')!.textContent).toContain('00000-000');
    expect(q('save-error')!.textContent).toContain('Revise os campos destacados.');
  });

  it('masks the phone while typing', async () => {
    await render();
    type(q<HTMLInputElement>('phone-input')!, '1133334444');
    expect(q<HTMLInputElement>('phone-input')!.value).toBe('(11) 3333-4444');
  });

  it('sends an expired session to the login', async () => {
    await render();
    save();
    http.expectOne({ method: 'PUT', url: '/api/users/me' }).flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();

    expect(logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  describe('logo', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:logo'), revokeObjectURL: vi.fn() }));
    });

    afterEach(() => vi.unstubAllGlobals());

    function pick(file: File): void {
      const input = q<HTMLInputElement>('logo-input')!;
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));
    }

    it('crops with the rounded square preview and uploads to the photo route', async () => {
      await render();
      pick(new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' }));
      await settle();

      const cropper = fixture.debugElement.query(By.directive(PhotoCropper));
      expect(q('cropper-preview')!.classList).toContain('preview__frame--rounded');
      (cropper.componentInstance as PhotoCropper).saved.emit(new Blob(['x'], { type: 'image/webp' }));

      const request = http.expectOne({ method: 'POST', url: '/api/users/me/photo' });
      expect(((request.request.body as FormData).get('file') as File).name).toBe('logo.webp');
      request.flush({ url: 'http://cdn/logo.webp' });
      await settle();

      expect(q('photo-cropper')).toBeNull();
      expect(q('logo-image')!.getAttribute('src')).toBe('http://cdn/logo.webp');
    });

    it('refuses an unsupported file without opening the editor', async () => {
      await render();
      pick(new File([new Uint8Array(10)], 'logo.gif', { type: 'image/gif' }));
      await settle();

      expect(q('logo-error')!.textContent).toContain('JPG, PNG ou WEBP');
      expect(q('photo-cropper')).toBeNull();
    });

    it('removes the logo and goes back to the initials', async () => {
      await render({ ...ME, logoUrl: 'http://cdn/logo.webp' });

      q('logo-remove')!.click();
      http.expectOne({ method: 'DELETE', url: '/api/users/me/photo' }).flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(q('logo-image')).toBeNull();
      expect(q('logo-initials')).not.toBeNull();
    });
  });
});
