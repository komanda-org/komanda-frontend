import { describeRestaurantError } from './restaurant-errors';

describe('describeRestaurantError', () => {
  it('on create, 403 shows the plan limit message sent by the API', () => {
    const error = {
      status: 403,
      messages: ['Seu plano permite até 5 vagas ativas. Encerre uma vaga ou mude de plano para publicar outra.'],
    };

    expect(describeRestaurantError(error, 'create')).toBe(
      'Seu plano permite até 5 vagas ativas. Encerre uma vaga ou mude de plano para publicar outra.',
    );
  });

  it('on create, 403 without a message falls back to the plan limit text', () => {
    expect(describeRestaurantError({ status: 403, messages: [] }, 'create')).toBe(
      'Você atingiu o limite de vagas ativas do seu plano.',
    );
  });

  it('keeps the ownership message for 403 on other actions', () => {
    expect(describeRestaurantError({ status: 403, messages: ['x'] }, 'edit')).toContain('não tem permissão');
  });
});
