/**
 * O erro da API, ja NORMALIZADO.
 *
 * Por que normalizar? Porque o NestJS devolve `message` em dois formatos
 * diferentes dependendo do erro:
 *
 *   400 (ValidationPipe)      -> message: string[]   ["Email deve ser valido", ...]
 *   409 (ConflictException)   -> message: string     "User already exists"
 *
 * Se cada tela tratasse isso sozinha, a checagem `Array.isArray(...)` estaria
 * espalhada pelo projeto inteiro. O interceptor converte tudo para o formato
 * abaixo uma unica vez, e a UI so conhece este tipo.
 */
export interface ErroApi {
  /** Status HTTP. 0 quando a requisicao nem chegou ao servidor (rede caiu / API fora do ar). */
  status: number;
  /** Sempre array, mesmo quando o servidor mandou uma string solta. */
  mensagens: string[];
}

/**
 * Type guard: ensina ao TypeScript que, se esta funcao devolve true, o valor
 * `unknown` pode ser tratado como ErroApi dali para a frente.
 *
 * E necessario porque o `error` de um catch/observable e `unknown` — o TS se
 * recusa (com razao) a assumir o formato de algo vindo da rede.
 */
export function ehErroApi(valor: unknown): valor is ErroApi {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'status' in valor &&
    'mensagens' in valor &&
    Array.isArray((valor as ErroApi).mensagens)
  );
}
