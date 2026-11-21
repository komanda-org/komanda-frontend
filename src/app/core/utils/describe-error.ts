import { isApiError } from '../models/api-error.model';

/**
 * Textos de erro de UMA tela.
 *
 * As frases de rede (0) e de servidor fora do ar (5xx) sao iguais em todo o app
 * e ficam aqui. O que muda de tela para tela e o "assunto" (suas candidaturas,
 * seu perfil...), entao cada tela passa o proprio fallback e, se precisar,
 * frases especificas por status (401, 403, 404...).
 */
export interface ErrorCopy {
  /** Frase usada quando nenhum status conhecido se aplica. */
  fallback: string;
  /** Frases da tela por status HTTP. Vencem as comuns. */
  byStatus?: Partial<Record<number, string>>;
}

const UNSTABLE = 'Nosso serviço está instável agora. Tente de novo em instantes.';

const COMMON: Partial<Record<number, string>> = {
  0: 'Não conseguimos conectar. Verifique sua internet e tente de novo.',
  500: UNSTABLE,
  502: UNSTABLE,
  503: UNSTABLE,
};

/**
 * Traduz um erro de requisicao numa frase acionavel, sem expor o status HTTP.
 *
 * Espera o erro ja normalizado pelo apiErrorInterceptor (ApiError). Qualquer
 * outra coisa (Error de JS, valor desconhecido) cai no fallback da tela.
 */
/**
 * Texto que o back mandou em `message`, pronto para a tela ("A. B."), ou null.
 * So usar em status cujo texto o back escreve para o usuario (validacao, regra de negocio).
 */
export function apiMessage(error: unknown): string | null {
  if (!isApiError(error)) {
    return null;
  }
  const sentences = error.messages
    .map((message) => message.trim())
    .filter(Boolean)
    .map((message) => (/[.!?]$/.test(message) ? message : `${message}.`));
  return sentences.length > 0 ? sentences.join(' ') : null;
}

export function describeError(error: unknown, copy: ErrorCopy): string {
  if (!isApiError(error)) {
    return copy.fallback;
  }

  return copy.byStatus?.[error.status] ?? COMMON[error.status] ?? copy.fallback;
}
