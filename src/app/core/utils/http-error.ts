import { isApiError } from '../models/api-error.model';

export function describeError(error: unknown, subject = 'o perfil'): string {
  const status = isApiError(error) ? error.status : -1;

  switch (status) {
    case 0:
      return 'Não conseguimos conectar. Verifique sua internet e tente de novo.';
    case 500:
    case 502:
    case 503:
      return 'Nosso serviço está instável agora. Tente de novo em instantes.';
    default:
      return `Não foi possível carregar ${subject}. Tente de novo.`;
  }
}
