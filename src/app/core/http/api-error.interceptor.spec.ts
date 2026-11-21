import { HttpErrorResponse } from '@angular/common/http';
import { normalize } from './api-error.interceptor';

const response = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

describe('normalize', () => {
  it('keeps string and string[] messages as they are', () => {
    expect(normalize(response(404, { message: 'Not found' }))).toEqual({
      status: 404,
      messages: ['Not found'],
    });
    expect(normalize(response(400, { message: ['a', 'b'] }))).toEqual({
      status: 400,
      messages: ['a', 'b'],
    });
  });

  it('maps class-validator objects to field paths, nested children included', () => {
    const error = normalize(
      response(400, {
        message: [
          { property: 'state', constraints: { matches: 'Estado deve ser a UF com 2 letras' } },
          {
            property: 'experiences',
            children: [
              {
                property: '1',
                children: [{ property: 'company', constraints: { isNotEmpty: 'Empresa obrigatória' } }],
              },
            ],
          },
        ],
      }),
    );

    expect(error.fieldErrors).toEqual({
      state: 'Estado deve ser a UF com 2 letras',
      'experiences.1.company': 'Empresa obrigatória',
    });
    expect(error.messages).toEqual(['Estado deve ser a UF com 2 letras', 'Empresa obrigatória']);
  });

  it('falls back to the generic copy when the array has nothing readable', () => {
    expect(normalize(response(400, { message: [42, null] })).messages).toEqual([
      'Não foi possível concluir a operação. Tente novamente em instantes.',
    ]);
  });
});
