import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JobForm, JobFormValue } from './job-form';

const VALUE: JobFormValue = {
  title: 'Sommelier Pleno',
  shift: 'NOITE',
  contractType: 'PJ',
  salary: 3000,
  description: 'Curadoria da carta de vinhos e treinamento do salão.',
  requirements: '',
  urgent: true,
};

describe('JobForm', () => {
  let fixture: ComponentFixture<JobForm>;
  const el = () => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement = HTMLElement>(id: string) =>
    el().querySelector<T>(`[data-testid="${id}"]`);

  function create(inputs: Record<string, unknown> = {}): void {
    TestBed.configureTestingModule({ imports: [JobForm], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(JobForm);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
  }

  it('lets the shift be chosen when creating', () => {
    create();

    expect(el().querySelectorAll('.chip[aria-pressed]').length).toBeGreaterThan(4);
    expect(q('shift-readonly')).toBeNull();
    expect(q('publish-btn')!.textContent).toContain('Publicar vaga');
  });

  it('starts from the initial value and emits the edited form', () => {
    create({ mode: 'edit', initial: VALUE });
    const emitted: JobFormValue[] = [];
    fixture.componentInstance.save.subscribe((value) => emitted.push(value));

    expect(q('shift-readonly')!.textContent).toContain('Noite');
    expect(q('preview')!.textContent).toContain('Sommelier Pleno');

    q<HTMLButtonElement>('publish-btn')!.click();

    expect(emitted).toEqual([VALUE]);
  });

  it('does not emit while the API limits are not met', () => {
    create({ initial: { ...VALUE, title: '    a   ', description: 'curta' } });
    const emitted: JobFormValue[] = [];
    fixture.componentInstance.save.subscribe((value) => emitted.push(value));

    q<HTMLButtonElement>('publish-btn')!.click();
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(el().textContent).toContain('O cargo deve ter entre 5 e 100 caracteres.');
    expect(el().textContent).toContain('pelo menos 20 caracteres');
  });
});
