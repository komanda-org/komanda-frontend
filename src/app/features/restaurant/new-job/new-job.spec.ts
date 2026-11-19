import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { NewJob, toPayload } from './new-job';

describe('toPayload', () => {
  const base = {
    title: '  Cozinheiro de Linha ',
    shift: '',
    contractType: 'CLT' as const,
    salary: null,
    description: ' Descrição longa o bastante para a vaga. ',
    requirements: '  ',
    urgent: false,
  };

  it('trims text and leaves optional fields out instead of sending empty values', () => {
    expect(toPayload(base)).toEqual({
      title: 'Cozinheiro de Linha',
      description: 'Descrição longa o bastante para a vaga.',
      contractType: 'CLT',
      urgent: false,
    });
  });

  it('rounds the salary to two decimals and keeps shift and requirements', () => {
    expect(
      toPayload({ ...base, shift: 'NOITE', salary: 2400.456, requirements: 'Experiência' }),
    ).toMatchObject({ shift: 'NOITE', salary: 2400.46, requirements: 'Experiência' });
  });
});

describe('NewJob', () => {
  let fixture: ComponentFixture<NewJob>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;

  function type(testid: string, value: string): void {
    const input = el().querySelector(`[data-testid="${testid}"]`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NewJob],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NewJob);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('blocks publishing and explains the required fields', () => {
    (el().querySelector('[data-testid="publish-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el().textContent).toContain('Informe o cargo da vaga.');
    expect(el().textContent).toContain('pelo menos 20 caracteres');
    http.expectNone('/api/jobs');
  });

  it('updates the live preview as the title is typed', () => {
    type('title-input', 'Sommelier Pleno');
    fixture.detectChanges();

    expect(el().querySelector('[data-testid="preview"]')?.textContent).toContain('Sommelier Pleno');
  });

  it('publishes the job and goes back to my jobs', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    type('title-input', 'Sommelier Pleno');
    type('description-input', 'Curadoria da carta de vinhos e treinamento do salão.');
    fixture.detectChanges();

    (el().querySelector('[data-testid="publish-btn"]') as HTMLButtonElement).click();
    const request = http.expectOne('/api/jobs');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      title: 'Sommelier Pleno',
      description: 'Curadoria da carta de vinhos e treinamento do salão.',
      contractType: 'CLT',
      urgent: false,
    });
    request.flush({ id: 'new' });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/my-jobs');
  });

  it('shows an actionable message when the API rejects the job', async () => {
    type('title-input', 'Sommelier Pleno');
    type('description-input', 'Curadoria da carta de vinhos e treinamento do salão.');
    fixture.detectChanges();

    (el().querySelector('[data-testid="publish-btn"]') as HTMLButtonElement).click();
    http.expectOne('/api/jobs').flush({ message: ['x'] }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector('[data-testid="submit-error"]')?.textContent).toContain(
      'Confira os campos da vaga',
    );
  });
});
