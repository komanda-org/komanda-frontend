import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JobForm, JobFormValue } from './job-form';

const VALUE: JobFormValue = {
  title: 'Sommelier Pleno',
  shifts: ['NOITE'],
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

  const pressed = (shift: string) => q('shift-' + shift)!.getAttribute('aria-pressed');
  const click = (id: string) => {
    q<HTMLButtonElement>(id)!.click();
    fixture.detectChanges();
  };

  it('offers the four shifts, without Madrugada, when creating', () => {
    create();

    const labels = ['MANHA', 'TARDE', 'NOITE', 'INTEGRAL'].map((shift) =>
      q('shift-' + shift)!.textContent?.trim(),
    );
    expect(labels).toEqual(['Manhã', 'Tarde', 'Noite', 'Integral']);
    expect(el().textContent).not.toContain('Madrugada');
    expect(el().textContent).toContain('Escolha um ou mais turnos. Integral cobre o dia todo.');
    expect(q('publish-btn')!.textContent).toContain('Publicar vaga');
  });

  it('lets several shifts be picked and unpicked', () => {
    create({ initial: { ...VALUE, shifts: [] } });
    const emitted: JobFormValue[] = [];
    fixture.componentInstance.save.subscribe((value) => emitted.push(value));

    click('shift-TARDE');
    click('shift-MANHA');
    click('shift-NOITE');
    click('shift-NOITE');

    expect([pressed('MANHA'), pressed('TARDE'), pressed('NOITE')]).toEqual(['true', 'true', 'false']);
    expect(q('preview')!.textContent).toContain('Manhã e Tarde');

    click('publish-btn');
    expect(emitted[0].shifts).toEqual(['MANHA', 'TARDE']);
  });

  it('keeps Integral exclusive', () => {
    create();

    click('shift-MANHA');
    click('shift-TARDE');
    click('shift-INTEGRAL');
    expect([pressed('MANHA'), pressed('TARDE'), pressed('INTEGRAL')]).toEqual(['false', 'false', 'true']);

    click('shift-NOITE');
    expect([pressed('NOITE'), pressed('INTEGRAL')]).toEqual(['true', 'false']);
  });

  it('lets the shift be edited on an existing job', () => {
    create({ mode: 'edit', initial: VALUE });

    expect(q('shift-readonly')).toBeNull();
    expect(pressed('NOITE')).toBe('true');

    click('shift-MANHA');
    expect([pressed('MANHA'), pressed('NOITE')]).toEqual(['true', 'true']);
  });

  it('starts from the initial value and emits the edited form', () => {
    create({ mode: 'edit', initial: VALUE });
    const emitted: JobFormValue[] = [];
    fixture.componentInstance.save.subscribe((value) => emitted.push(value));

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
