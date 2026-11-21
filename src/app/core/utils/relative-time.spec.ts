import { relativeTime } from './relative-time';

describe('relativeTime', () => {
  const now = new Date(2026, 10, 20, 15, 0, 0);
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const MIN = 60_000;

  it('describes recent moments in minutes and hours', () => {
    expect(relativeTime(ago(20_000), now)).toBe('agora');
    expect(relativeTime(ago(5 * MIN), now)).toBe('há 5 min');
    expect(relativeTime(ago(3 * 60 * MIN), now)).toBe('há 3 h');
  });

  it('uses "ontem", then days, then the date', () => {
    expect(relativeTime(new Date(2026, 10, 19, 22, 0).toISOString(), now)).toBe('ontem');
    expect(relativeTime(new Date(2026, 10, 16, 9, 0).toISOString(), now)).toBe('há 4 dias');
    expect(relativeTime(new Date(2026, 10, 2, 9, 0).toISOString(), now)).toMatch(/^2 de nov/);
  });
});
