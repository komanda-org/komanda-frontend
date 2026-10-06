import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeletorMesAno } from './seletor-mes-ano';

/**
 * Se o seletor nao emitir, o campo Periodo chega vazio ao salvar a experiencia.
 * Cobre os tres caminhos que entregam (ou descartam) o valor: clique no mes,
 * digitacao com saida do campo, e limpar.
 */
describe('SeletorMesAno', () => {
  let fixture: ComponentFixture<SeletorMesAno>;
  let emitidos: (string | null)[];

  const input = () => fixture.nativeElement.querySelector('input.seletor-mes-ano__entrada');
  const painel = () => fixture.nativeElement.querySelector('.seletor-mes-ano__painel');
  const abrir = () => {
    input().click();
    fixture.detectChanges();
  };
  const mes = (nome: string) =>
    [...fixture.nativeElement.querySelectorAll('.seletor-mes-ano__mes')].find(
      (b: HTMLElement) => b.textContent?.trim() === nome,
    ) as HTMLElement;
  const sairDoCampo = () =>
    input().dispatchEvent(new FocusEvent('blur', { relatedTarget: document.body }));
  /** Roda efeitos e CD: sem isso o campo so reflete o valor no proximo ciclo. */
  const estabilizar = () => {
    TestBed.flushEffects();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SeletorMesAno] }).compileComponents();
    fixture = TestBed.createComponent(SeletorMesAno);
    fixture.detectChanges();
    emitidos = [];
    // Espelha o que o template real faz (valorChange/valor ligados ao form).
    fixture.componentInstance.valorChange.subscribe(valor => {
      emitidos.push(valor);
      fixture.componentRef.setInput('valor', valor);
    });
  });

  it('cria o componente com o painel fechado', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(painel()).toBeNull();
  });

  it('mostra no campo o valor que o pai traz', () => {
    fixture.componentRef.setInput('valor', '09/2020');
    estabilizar();

    expect(input().value).toBe('09/2020');
  });

  it('escolher um mes emite o valor formatado e fecha o painel', () => {
    abrir();
    expect(painel()).not.toBeNull();

    mes('Mar').click();
    fixture.detectChanges();

    const anoAtual = new Date().getFullYear();
    expect(emitidos).toEqual([`03/${anoAtual}`]);
    expect(input().value).toBe(`03/${anoAtual}`);
    expect(painel()).toBeNull();
  });

  it('usa o ano escolhido nas setas antes de clicar no mes', () => {
    abrir();
    fixture.nativeElement.querySelector('[aria-label="Ano anterior"]').click();
    mes('Nov').click();
    fixture.detectChanges();

    expect(emitidos).toEqual([`11/${new Date().getFullYear() - 1}`]);
  });

  it('normaliza o que foi digitado quando o foco sai do campo', () => {
    input().value = '072019';
    input().dispatchEvent(new Event('input'));
    sairDoCampo();

    expect(emitidos).toEqual(['07/2019']);
    expect(input().value).toBe('07/2019');
  });

  it('descarta texto incompleto ao sair, em vez de mandar meia data', () => {
    fixture.componentRef.setInput('valor', '05/2024');
    estabilizar();

    input().value = '0';
    input().dispatchEvent(new Event('input'));
    sairDoCampo();
    estabilizar();

    expect(emitidos).toEqual(['']);
    expect(input().value).toBe('');
  });

  it('nao fecha o painel quando o foco segue para dentro dele', async () => {
    abrir();
    input().dispatchEvent(new FocusEvent('blur', { relatedTarget: painel() }));

    await new Promise(resolve => setTimeout(resolve, 250));
    fixture.detectChanges();

    expect(painel()).not.toBeNull();
  });

  it('fecha o painel quando o foco sai de vez do componente', async () => {
    abrir();
    sairDoCampo();

    await new Promise(resolve => setTimeout(resolve, 250));
    fixture.detectChanges();

    expect(painel()).toBeNull();
  });

  it('botao Limpar zera o campo e avisa o formulario', () => {
    fixture.componentRef.setInput('valor', '05/2024');
    estabilizar();
    abrir();

    fixture.nativeElement.querySelector('.seletor-mes-ano__rodape .botao').click();
    estabilizar();

    expect(emitidos).toEqual(['']);
    expect(input().value).toBe('');
    expect(painel()).toBeNull();
  });

  it('Enter confirma o valor digitado sem precisar clicar em OK', () => {
    input().value = '122022';
    input().dispatchEvent(new Event('input'));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(emitidos).toEqual(['12/2022']);
  });
});
