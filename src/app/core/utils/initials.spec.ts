import { initials } from './initials';

describe('initials', () => {
  it('pega a primeira letra do primeiro e do ultimo nome', () => {
    expect(initials('bistrô do zé')).toBe('BZ');
  });

  it('respeita max = 1', () => {
    expect(initials('Bistrô do Zé', 1)).toBe('B');
  });

  it('ignora partes sem letra e espacos sobrando', () => {
    expect(initials('  Bar & Cia  ')).toBe('BC');
  });

  it('nome vazio devolve string vazia', () => {
    expect(initials('   ')).toBe('');
  });
});
