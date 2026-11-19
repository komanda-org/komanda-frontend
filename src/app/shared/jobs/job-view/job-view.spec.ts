import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Job } from '../../../core/models/jobs.model';
import { JobView, JobViewMode, PREVIEW_APPLY_HINT } from './job-view';

const JOB: Job = {
  id: 'job-1',
  title: 'Cozinheiro de Linha',
  description: 'Preparo das praças quentes.',
  requirements: null,
  salary: '2400',
  contractType: 'CLT',
  status: 'ABERTA',
  restaurantId: 'rest-1',
  restaurant: {
    restaurantName: 'Le Petit Bistro',
    logoUrl: null,
    cuisineType: 'Cozinha francesa',
    averageRating: null,
    address: 'Rua das Flores, 123',
    zipCode: null,
  },
  createdAt: '2026-11-10T12:00:00.000Z',
  shift: 'NOITE',
  urgent: false,
};

@Component({
  imports: [JobView],
  template: `
    <app-job-view [job]="job" [mode]="mode()" (apply)="applied = applied + 1">
      <a data-testid="projected">Ação extra</a>
    </app-job-view>
  `,
})
class Host {
  readonly job = JOB;
  readonly mode = signal<JobViewMode>('professional');
  applied = 0;
}

describe('JobView', () => {
  let fixture: ComponentFixture<Host>;
  const q = <T extends HTMLElement = HTMLElement>(id: string) =>
    (fixture.nativeElement as HTMLElement).querySelector<T>(`[data-testid="${id}"]`);

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('renders the job and the projected actions inside the side card', () => {
    expect(q('job-title')?.textContent).toContain('Cozinheiro de Linha');
    expect(q('restaurant-name')?.textContent).toContain('Le Petit Bistro');
    expect(q('job-requirements')).toBeNull();
    expect(q('projected')?.closest('.side__card')).not.toBeNull();
  });

  it('emits apply in professional mode', () => {
    q<HTMLButtonElement>('apply-btn')!.click();

    expect(fixture.componentInstance.applied).toBe(1);
    expect(q('apply-hint')).toBeNull();
  });

  it('keeps Candidatar-se disabled with the reason in preview mode', () => {
    fixture.componentInstance.mode.set('preview');
    fixture.detectChanges();

    const button = q<HTMLButtonElement>('apply-btn')!;
    expect(button.disabled).toBe(true);
    expect(q('apply-tooltip')?.getAttribute('title')).toBe(PREVIEW_APPLY_HINT);
    expect(q('apply-hint')?.textContent).toContain(PREVIEW_APPLY_HINT);
    button.click();
    expect(fixture.componentInstance.applied).toBe(0);
  });
});
