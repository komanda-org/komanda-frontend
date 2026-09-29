import { apenasDigitos, cnpjEhValido } from './cnpj';

describe('cnpjEhValido', () => {
  it('aceita CNPJ valido com mascara', () => {
    expect(cnpjEhValido('11.222.333/0001-81')).toBe(true);
  });

  it('aceita o mesmo CNPJ sem mascara', () => {
    expect(cnpjEhValido('11222333000181')).toBe(true);
  });

  it('rejeita digito verificador errado', () => {
    expect(cnpjEhValido('11.222.333/0001-82')).toBe(false);
  });

  it('rejeita quantidade de digitos diferente de 14', () => {
    expect(cnpjEhValido('11.222.333/0001-8')).toBe(false);
    expect(cnpjEhValido('112223330001811')).toBe(false);
  });

  it('rejeita sequencias de digitos repetidos', () => {
    expect(cnpjEhValido('00.000.000/0000-00')).toBe(false);
    expect(cnpjEhValido('11111111111111')).toBe(false);
  });

  it('rejeita texto que nao contem numeros', () => {
    expect(cnpjEhValido('')).toBe(false);
    expect(cnpjEhValido('nao sou um cnpj')).toBe(false);
  });
});

describe('apenasDigitos', () => {
  it('remove tudo que nao for numero', () => {
    expect(apenasDigitos('11.222.333/0001-81')).toBe('11222333000181');
    expect(apenasDigitos('(11) 98765-4321')).toBe('11987654321');
  });
});
