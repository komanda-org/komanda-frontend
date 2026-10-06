/**
 * O erro da API, ja NORMALIZADO. O Nest devolve `message` como string[] no 400
 * e como string no 409; o interceptor converte uma vez para o formato abaixo e
 * a UI so conhece este tipo.
 */
export interface ErroApi {
  /** Status HTTP. 0 quando a requisicao nem chegou ao servidor (rede caiu / API fora do ar). */
  status: number;
  /** Sempre array, mesmo quando o servidor mandou uma string solta. */
  mensagens: string[];
}

/**
 * Type guard: `error` de catch/observable e `unknown` e o TS (com razao) se
 * recusa a assumir o formato de algo vindo da rede.
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
