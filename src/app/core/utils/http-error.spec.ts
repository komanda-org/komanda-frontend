import { describeError } from './http-error';

describe('describeError', () => {
  it('never exposes the HTTP status in the copy', () => {
    for (const status of [0, 401, 403, 500, 418]) {
      expect(describeError({ status, messages: ['x'] })).not.toMatch(/\d{3}/);
    }
  });

  it('uses the subject in the default copy', () => {
    expect(describeError(new Error('x'), 'as vagas')).toContain('as vagas');
  });
});
