import { FormControl } from '@angular/forms';
import { minimoAparado, urlValida } from './validadores';

/** Roda um ValidatorFn sobre um valor solto, sem precisar montar um FormGroup. */
function validar(fn: ReturnType<typeof minimoAparado>, valor: string) {
  return fn(new FormControl(valor));
}

describe('minimoAparado', () => {
  it('aceita texto que atinge o minimo depois do trim', () => {
    expect(validar(minimoAparado(3), 'Ana')).toBeNull();
    expect(validar(minimoAparado(3), '  Ana  ')).toBeNull();
  });

  it('rejeita texto que so atinge o minimo por causa dos espacos', () => {
    // Este e o caso que Validators.minLength deixava passar e o back recusava:
    // 5 caracteres crus, 2 depois do trim.
    expect(validar(minimoAparado(3), 'Jo   ')).not.toBeNull();
  });

  it('rejeita string feita so de espacos', () => {
    expect(validar(minimoAparado(1), '     ')).not.toBeNull();
  });

  it('ignora campo vazio (isso e trabalho do required)', () => {
    expect(validar(minimoAparado(20), '')).toBeNull();
  });

  it('devolve a chave minlength no formato que mensagens-de-erro entende', () => {
    expect(validar(minimoAparado(20), 'curto')).toEqual({
      minlength: { requiredLength: 20, actualLength: 5 },
    });
  });
});

describe('urlValida', () => {
  it('aceita http e https com dominio', () => {
    expect(validar(urlValida(), 'https://cdn.komanda.com/logo.png')).toBeNull();
    expect(validar(urlValida(), 'http://komanda.com/logo.png')).toBeNull();
  });

  it('rejeita host sem ponto, como o require_tld do @IsUrl no back', () => {
    expect(validar(urlValida(), 'http://localhost/logo.png')).not.toBeNull();
  });

  it('rejeita protocolo que nao seja http/https', () => {
    expect(validar(urlValida(), 'javascript:alert(1)')).not.toBeNull();
    expect(validar(urlValida(), 'ftp://komanda.com/logo.png')).not.toBeNull();
  });

  it('rejeita texto que nem e URL', () => {
    expect(validar(urlValida(), 'minha foto')).not.toBeNull();
  });

  it('ignora campo vazio (logoUrl e opcional)', () => {
    expect(validar(urlValida(), '')).toBeNull();
  });
});
