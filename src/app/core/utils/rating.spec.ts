import { formatRating, starFills } from './rating';

describe('rating utils', () => {
  it('formats ratings with the pt-BR decimal comma', () => {
    expect(formatRating(4.9)).toBe('4,9');
    expect(formatRating(5)).toBe('5,0');
  });

  it('builds the star fills, half star included', () => {
    expect(starFills(5)).toEqual(['full', 'full', 'full', 'full', 'full']);
    expect(starFills(3.5)).toEqual(['full', 'full', 'full', 'half', 'empty']);
    expect(starFills(0)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
  });

  it('rounds to the nearest half star so the drawing matches the written rating', () => {
    expect(starFills(4.9)).toEqual(['full', 'full', 'full', 'full', 'full']);
    expect(starFills(4.7)).toEqual(['full', 'full', 'full', 'full', 'half']);
    expect(starFills(4.3)).toEqual(['full', 'full', 'full', 'full', 'half']);
    expect(starFills(4.2)).toEqual(['full', 'full', 'full', 'full', 'empty']);
  });
});
