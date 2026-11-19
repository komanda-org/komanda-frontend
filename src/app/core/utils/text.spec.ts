import { initials } from './text';

describe('initials', () => {
  it('takes initials from letters only', () => {
    expect(initials('Gabriel M.')).toBe('GM');
    expect(initials("L'Atelier des Sens")).toBe('LS');
  });

  it('handles a single word and empty input', () => {
    expect(initials('Profissional')).toBe('P');
    expect(initials('   ')).toBe('');
  });
});
