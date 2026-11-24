import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { ProfessionalMe } from '../../../core/models/profile.model';
import { AuthService } from '../../../core/services/auth.service';
import {
  ProfileEdit,
  describeSaveError,
  experienceDates,
  describePhotoError,
  toFormValue,
  toPayload,
  trimmedLength,
} from './profile-edit';
import { PhotoCropper } from '../../../shared/ui/photo-cropper/photo-cropper';

const ME: ProfessionalMe = {
  role: 'PROFISSIONAL',
  id: 'u1',
  fullName: 'Jose Ravani',
  mainRole: 'Sushiman',
  profilePhoto: null,
  experienceSummary: 'Dez anos de balcão.',
  specialties: ['Sushi', 'Sashimi'],
  neighborhood: null,
  city: 'São Paulo',
  state: 'SP',
  experiences: [
    {
      id: 'e1',
      company: 'Kinoshita',
      role: 'Sushiman',
      startDate: '2020-03-01',
      endDate: null,
      description: null,
    },
    {
      id: 'e2',
      company: 'Jun Sakamoto',
      role: 'Auxiliar',
      startDate: '2017-01-01',
      endDate: '2020-01-31',
      description: 'Preparo do arroz.',
    },
  ],
  availability: { workModels: ['CLT'], mobility: null },
};

describe('ProfileEdit — pure functions', () => {
  it('builds the PUT body flattened, without ids or availability', () => {
    const payload = toPayload(toFormValue(ME));

    expect(payload).toEqual({
      fullName: 'Jose Ravani',
      mainRole: 'Sushiman',
      experienceSummary: 'Dez anos de balcão.',
      neighborhood: null,
      city: 'São Paulo',
      state: 'SP',
      specialties: ['Sushi', 'Sashimi'],
      workModels: ['CLT'],
      mobility: null,
      experiences: [
        { company: 'Kinoshita', role: 'Sushiman', startDate: '2020-03-01', endDate: null, description: null },
        {
          company: 'Jun Sakamoto',
          role: 'Auxiliar',
          startDate: '2017-01-01',
          endDate: '2020-01-31',
          description: 'Preparo do arroz.',
        },
      ],
    });
    expect(JSON.stringify(payload)).not.toMatch(/"id"|availability/);
  });

  it('sends null (never "") for cleared optional text and endDate null for the current job', () => {
    const value = toFormValue(ME);
    value.city = '';
    value.state = '';
    value.experiences[1].current = true;

    const payload = toPayload(value);

    expect(payload.city).toBeNull();
    expect(payload.state).toBeNull();
    expect(payload.experiences[1].endDate).toBeNull();
  });

  it('starts empty lists and null mobility when availability was never informed', () => {
    const value = toFormValue({ ...ME, availability: null, experiences: [], specialties: [] });

    expect(value.workModels).toEqual([]);
    expect(value.mobility).toBeNull();
    expect(toPayload(value).experiences).toEqual([]);
  });

  it('validates names ignoring surrounding spaces', () => {
    const validator = trimmedLength(3, 100);
    expect(validator(new FormControl('    '))).toEqual({ required: true });
    expect(validator(new FormControl(' ab '))).toEqual({ length: { min: 3, max: 100 } });
    expect(validator(new FormControl('Jose'))).toBeNull();
  });

  it('rejects an end date before the start, and a missing end without "Emprego atual"', () => {
    const group = (startDate: string, endDate: string, current = false) =>
      new FormGroup({
        startDate: new FormControl(startDate),
        endDate: new FormControl(endDate),
        current: new FormControl(current),
      });

    expect(experienceDates(group('2020-05-10', '2020-05-09'))).toEqual({ endBeforeStart: true });
    expect(experienceDates(group('2020-05-10', '2020-05-10'))).toBeNull();
    expect(experienceDates(group('2020-05-10', ''))).toEqual({ endRequired: true });
    expect(experienceDates(group('2020-05-10', '', true))).toBeNull();
  });

  it('never exposes the HTTP status or technical field names in the save error', () => {
    for (const status of [0, 400, 403, 500, 418]) {
      expect(describeSaveError({ status, messages: ['x'] })).not.toMatch(/\d{3}/);
    }
    expect(
      describeSaveError({
        status: 400,
        messages: ['Experiência em X: endDate não pode ser anterior a startDate'],
      }),
    ).toBe('Experiência em X: data de fim não pode ser anterior a data de início');
  });

  it('turns photo upload failures into actionable copy, without the HTTP status', () => {
    const apiError = (status: number, messages: string[] = []) => ({ status, messages, fieldErrors: null });
    expect(describePhotoError(apiError(400, ['Formato inválido. Use JPG, PNG ou WEBP']))).toBe(
      'Formato inválido. Use JPG, PNG ou WEBP.',
    );
    expect(describePhotoError(apiError(413))).toContain('5 MB');
    expect(describePhotoError(apiError(429))).toContain('Muitas tentativas');
    expect(describePhotoError(apiError(500))).not.toMatch(/500/);
  });
});

describe('ProfileEdit', () => {
  let fixture: ComponentFixture<ProfileEdit>;
  let http: HttpTestingController;
  let router: Router;
  const logout = vi.fn();
  const el = () => fixture.nativeElement as HTMLElement;
  const q = <T extends Element = HTMLElement>(id: string) =>
    el().querySelector<T>(`[data-testid="${id}"]`);
  const qa = (id: string) => Array.from(el().querySelectorAll<HTMLElement>(`[data-testid="${id}"]`));

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(me: ProfessionalMe = ME): Promise<void> {
    fixture = TestBed.createComponent(ProfileEdit);
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
    q<HTMLFormElement>('profile-form')!.dispatchEvent(new Event('submit'));
  }

  beforeEach(() => {
    logout.mockReset();
    TestBed.configureTestingModule({
      imports: [ProfileEdit],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { logout, getUser: () => ({ id: 'u1', role: 'PROFISSIONAL' }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('fills every field with the GET data', async () => {
    await render();

    expect(q<HTMLInputElement>('fullName-input')!.value).toBe('Jose Ravani');
    expect(q<HTMLInputElement>('mainRole-input')!.value).toBe('Sushiman');
    expect(q<HTMLSelectElement>('state-select')!.value).toBe('SP');
    expect(qa('specialty-chip').map((chip) => chip.textContent?.replace('×', '').trim())).toEqual([
      'Sushi',
      'Sashimi',
    ]);
    expect(qa('work-model').filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(qa('mobility').some((b) => b.getAttribute('aria-pressed') === 'true')).toBe(false);
    expect(qa('experience-form')).toHaveLength(2);
    expect(qa('experience-current').map((c) => (c as HTMLInputElement).checked)).toEqual([true, false]);
    expect(qa('experience-end').map((input) => (input as HTMLInputElement).value)).toEqual(['2020-01-31']);
  });

  it('saves the edited values and returns to the profile with a notice', async () => {
    await render();
    type(q<HTMLInputElement>('mainRole-input')!, 'Itamae');
    type(q<HTMLInputElement>('specialty-input')!, 'Omakase');
    q('specialty-add')!.click();
    qa('mobility')[2].click();
    await settle();

    save();
    await settle();
    expect(q<HTMLButtonElement>('save-btn')!.disabled).toBe(true);
    expect(q('save-btn')!.textContent).toContain('Salvando');

    const request = http.expectOne('/api/users/me');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.mainRole).toBe('Itamae');
    expect(request.request.body.specialties).toEqual(['Sushi', 'Sashimi', 'Omakase']);
    expect(request.request.body.mobility).toBe('NACIONAL');
    expect(request.request.body.experiences[1].endDate).toBe('2020-01-31');
    request.flush({ userId: 'u1', role: 'PROFISSIONAL', profile: ME });
    await settle();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/perfil', {
      state: { notice: 'Perfil atualizado.' },
    });
  });

  it('sends the full remaining list when an experience is removed', async () => {
    await render();
    qa('experience-remove')[0].click();
    await settle();

    save();
    const request = http.expectOne('/api/users/me');
    expect(request.request.body.experiences).toEqual([
      expect.objectContaining({ company: 'Jun Sakamoto' }),
    ]);
    request.flush({ userId: 'u1', role: 'PROFISSIONAL', profile: ME });
  });

  it('blocks the save when the end date is before the start', async () => {
    await render();
    type(qa('experience-end')[0] as HTMLInputElement, '2016-12-31');
    await settle();

    save();
    await settle();

    expect(q('experience-end-error')!.textContent).toContain('anterior à de início');
    expect(q('save-error')!.textContent).toContain('Revise os campos destacados.');
    http.expectNone((r) => r.method === 'PUT');
  });

  it('caps specialties at 50 characters each', async () => {
    await render();
    type(q<HTMLInputElement>('specialty-input')!, 'x'.repeat(51));
    q('specialty-add')!.click();
    await settle();

    expect(q('specialty-error')!.textContent).toContain('até 50 caracteres');
    expect(qa('specialty-chip')).toHaveLength(2);
  });

  it('shows class-validator errors on the matching field', async () => {
    await render();
    save();
    http.expectOne('/api/users/me').flush(
      {
        message: [
          {
            property: 'experiences',
            children: [
              {
                property: '0',
                children: [{ property: 'company', constraints: { maxLength: 'Empresa muito longa' } }],
              },
            ],
          },
        ],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle();

    expect(qa('experience-form')[0].textContent).toContain('Empresa muito longa');
    expect(q('save-error')!.textContent).toContain('Revise os campos destacados.');
    expect(q<HTMLButtonElement>('save-btn')!.disabled).toBe(false);
  });

  it('sends an expired session to the login', async () => {
    await render();
    save();
    http.expectOne('/api/users/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();

    expect(logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  describe('profile photo', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() }));
    });

    afterEach(() => vi.unstubAllGlobals());

    function pick(file: File): void {
      const input = q<HTMLInputElement>('photo-input')!;
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));
    }

    const image = (type = 'image/png', size = 1024) => new File([new Uint8Array(size)], 'foto.png', { type });

    function cropper(): PhotoCropper {
      return fixture.debugElement.query(By.directive(PhotoCropper)).componentInstance as PhotoCropper;
    }

    it('shows the initials without a photo and no URL field anymore', async () => {
      await render();

      expect(q('photo-initials')!.textContent?.trim()).toBe('JR');
      expect(q('photo-remove')).toBeNull();
      expect(el().querySelector('input[type="url"]')).toBeNull();
    });

    it('refuses a file that is too big or not an image before opening the editor', async () => {
      await render();

      pick(image('image/gif'));
      await settle();
      expect(q('photo-error')!.textContent).toContain('JPG, PNG ou WEBP');
      expect(q('photo-cropper')).toBeNull();

      pick(image('image/jpeg', 5 * 1024 * 1024 + 1));
      await settle();
      expect(q('photo-error')!.textContent).toContain('5 MB');
      expect(q('photo-cropper')).toBeNull();
    });

    it('uploads the cropped image as multipart and swaps the avatar without reloading', async () => {
      await render();
      pick(image());
      await settle();
      expect(q('photo-cropper')).not.toBeNull();

      cropper().saved.emit(new Blob(['x'], { type: 'image/webp' }));
      await settle();
      expect(q('cropper-save')!.textContent).toContain('Enviando');

      const request = http.expectOne('/api/users/me/photo');
      expect(request.request.method).toBe('POST');
      const body = request.request.body as FormData;
      expect(body).toBeInstanceOf(FormData);
      expect((body.get('file') as File).name).toBe('foto.webp');
      expect(request.request.headers.has('Content-Type')).toBe(false);
      request.flush({ url: 'http://cdn/uploads/profile-photos/1.webp' });
      await settle();

      expect(q('photo-cropper')).toBeNull();
      expect(q('photo-avatar')!.getAttribute('src')).toBe('http://cdn/uploads/profile-photos/1.webp');
    });

    it('keeps the editor open with the API message when the upload fails', async () => {
      await render();
      pick(image());
      await settle();

      cropper().saved.emit(new Blob(['x'], { type: 'image/jpeg' }));
      http
        .expectOne('/api/users/me/photo')
        .flush({ message: 'A imagem deve ter no máximo 5 MB' }, { status: 400, statusText: 'Bad Request' });
      await settle();

      expect(q('cropper-error')!.textContent).toContain('A imagem deve ter no máximo 5 MB.');
      expect(q('cropper-save')!.textContent).toContain('Salvar foto');
    });

    it('removes the photo and goes back to the initials', async () => {
      await render({ ...ME, profilePhoto: 'http://cdn/a.webp' });
      expect(q('photo-avatar')!.getAttribute('src')).toBe('http://cdn/a.webp');

      q('photo-remove')!.click();
      const request = http.expectOne('/api/users/me/photo');
      expect(request.request.method).toBe('DELETE');
      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(q('photo-avatar')).toBeNull();
      expect(q('photo-initials')).not.toBeNull();
    });

    it('never sends the photo in the profile PUT', async () => {
      await render({ ...ME, profilePhoto: 'http://cdn/a.webp' });
      save();
      const request = http.expectOne({ method: 'PUT', url: '/api/users/me' });
      expect('profilePhoto' in request.request.body).toBe(false);
      request.flush({ userId: 'u1', role: 'PROFISSIONAL', profile: ME });
      await settle();
    });
  });
});
