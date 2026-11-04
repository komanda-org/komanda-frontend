import { ApiError } from '../models/api-error.model';

/**
 * Maps the known POST /auth/login failures to user-facing PT-BR text.
 *
 * The match is on the raw back-end message rather than only the HTTP status,
 * because the API uses 401 for three different situations ("Invalid
 * password", "Conta nao encontrada", "User account is inactive") that each
 * deserve their own copy.
 */
export function translateLoginError(error: ApiError): string {
  if (error.status === 429) {
    return 'Muitas tentativas. Aguarde um minuto antes de tentar novamente.';
  }

  if (error.status === 0) {
    return 'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.';
  }

  switch (error.messages[0]) {
    case 'User not found':
    case 'Conta nao encontrada':
      return 'Não encontramos uma conta com este email.';
    case 'Invalid password':
      return 'Senha incorreta.';
    case 'User account is inactive':
      return 'Sua conta está inativa. Entre em contato com o suporte.';
    default:
      return 'Não foi possível entrar. Tente novamente.';
  }
}
