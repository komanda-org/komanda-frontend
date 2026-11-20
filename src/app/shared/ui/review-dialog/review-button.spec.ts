import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ReviewButton } from './review-button';
import { REVIEW_SENT_TOAST, describeReviewError, starsLabel } from './review-dialog';

describe('ReviewButton + ReviewDialog', () => {
  let fixture: ComponentFixture<ReviewButton>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement = HTMLElement>(id: string) =>
    el().querySelector<T>(`[data-testid="${id}"]`);

  function open(): void {
    q('review-btn')!.click();
    fixture.detectChanges();
  }

  function rate(value: number): void {
    q<HTMLInputElement>(`star-${value}`)!.click();
    fixture.detectChanges();
  }

  function send(): void {
    q<HTMLButtonElement>('review-submit')!.click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ReviewButton],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => ({ id: 'me', role: 'PROFISSIONAL' }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReviewButton);
    fixture.componentRef.setInput('jobId', 'j1');
    fixture.componentRef.setInput('receiverId', 'r1');
    fixture.componentRef.setInput('receiverName', 'Cantina Bella Massa');
    fixture.componentRef.setInput('label', 'Avaliar restaurante');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('opens an accessible dialog with five labelled stars', () => {
    expect(q('review-btn')!.textContent).toContain('Avaliar restaurante');
    open();

    const dialog = q('review-dialog')!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.textContent).toContain('Cantina Bella Massa');
    expect(dialog.querySelector('[role="radiogroup"]')).not.toBeNull();
    const labels = Array.from(dialog.querySelectorAll('input[type="radio"]')).map((input) =>
      input.getAttribute('aria-label'),
    );
    expect(labels).toEqual(['1 estrela', '2 estrelas', '3 estrelas', '4 estrelas', '5 estrelas']);
  });

  it('blocks publishing without a rating with an actionable message', () => {
    open();
    send();

    expect(q('review-error')?.textContent).toContain('Escolha uma nota');
    expect(q<HTMLButtonElement>('review-submit')!.disabled).toBe(false);
    http.expectNone('/api/users/reviews');
  });

  it('labels the rating under the stars and sends it', () => {
    open();
    rate(4);

    expect(q('rating-label')?.textContent).toContain('Muito bom');
  });

  it('shows the success state only after the API confirms the publication', () => {
    open();
    rate(5);
    send();

    expect(q('review-success')).toBeNull();
    expect(q<HTMLButtonElement>('review-submit')!.disabled).toBe(true);

    http.expectOne('/api/users/reviews').flush({ id: 'rev1' }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(q('review-success')?.textContent).toContain('Avaliação publicada!');
    expect(q('review-dialog')?.textContent).not.toContain('Pular por agora');
  });

  it('sends the review, shows the toast and turns the button into "Avaliado ✓"', () => {
    open();
    rate(5);
    const comment = q<HTMLTextAreaElement>('review-comment')!;
    comment.value = '  Equipe muito organizada. ';
    comment.dispatchEvent(new Event('input'));
    send();

    const request = http.expectOne('/api/users/reviews');
    expect(request.request.body).toEqual({
      jobId: 'j1',
      receiverId: 'r1',
      rating: 5,
      comment: 'Equipe muito organizada.',
    });
    expect(q<HTMLButtonElement>('review-submit')!.disabled).toBe(true);
    request.flush({ id: 'rev1' }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(TestBed.inject(ToastService).message()).toBe(REVIEW_SENT_TOAST);
    expect(q('review-success')).not.toBeNull();
    expect(q('review-dialog')!.textContent).toContain('Avaliação publicada!');
    expect(q('review-dialog')!.textContent).toContain(
      'Obrigado por ajudar a manter a comunidade Komanda segura e qualificada.',
    );

    q<HTMLButtonElement>('review-done-btn')!.click();
    fixture.detectChanges();

    expect(q('review-dialog')).toBeNull();
    const done = q<HTMLButtonElement>('reviewed')!;
    expect(done.textContent).toContain('Avaliado ✓');
    expect(done.disabled).toBe(true);
  });

  it('leaves the comment out when it is blank', () => {
    open();
    rate(3);
    send();

    expect(http.expectOne('/api/users/reviews').request.body).toEqual({ jobId: 'j1', receiverId: 'r1', rating: 3 });
  });

  it('treats 409 as already reviewed, not as an error', () => {
    open();
    rate(4);
    send();
    http
      .expectOne('/api/users/reviews')
      .flush(
        { message: 'Você já avaliou este recebedor nesta vaga' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(q('review-error')).toBeNull();
    expect(q('review-success')).not.toBeNull();
    q<HTMLButtonElement>('review-done-btn')!.click();
    fixture.detectChanges();
    expect(q('reviewed')!.textContent).toContain('Avaliado ✓');
  });

  it('shows the API reason on 403 and keeps the dialog open', () => {
    open();
    rate(2);
    send();
    http
      .expectOne('/api/users/reviews')
      .flush({ message: 'Usuário avaliado não encontrado' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(q('review-error')!.textContent).toContain('Usuário avaliado não encontrado.');
    expect(q('review-success')).toBeNull();
    expect(q<HTMLButtonElement>('review-submit')!.disabled).toBe(false);
    expect(q('reviewed')).toBeNull();
  });

  it('closes on Pular por agora without sending', () => {
    open();
    q('review-skip')!.click();
    fixture.detectChanges();

    expect(q('review-dialog')).toBeNull();
    expect(q('review-btn')).not.toBeNull();
  });

  it('never exposes the HTTP status nor the English validation text', () => {
    expect(starsLabel(1)).toBe('1 estrela');
    for (const status of [0, 400, 401, 404, 429, 500]) {
      const message = describeReviewError({ status, messages: ['rating must not be greater than 5'] });
      expect(message).not.toMatch(/\d{3}|rating must/);
    }
  });
});
