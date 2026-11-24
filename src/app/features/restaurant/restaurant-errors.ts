import { isApiError } from '../../core/models/api-error.model';
import { apiMessage } from '../../core/utils/describe-error';

export type RestaurantAction = 'load' | 'close' | 'create' | 'decide' | 'edit';

const FALLBACK: Record<RestaurantAction, string> = {
  load: 'Não foi possível carregar suas vagas. Tente novamente.',
  close: 'Não foi possível encerrar a vaga. Tente novamente.',
  create: 'Não foi possível publicar a vaga. Tente novamente.',
  decide: 'Não foi possível atualizar o candidato. Tente novamente.',
  edit: 'Não foi possível salvar as alterações. Tente novamente.',
};

export function describeRestaurantError(error: unknown, action: RestaurantAction): string {
  switch (isApiError(error) ? error.status : -1) {
    case 0:
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    case 400:
      if (action === 'edit') {
        return apiMessage(error) ?? 'Confira os campos da vaga e tente salvar de novo.';
      }
      return action === 'create'
        ? 'Confira os campos da vaga e tente publicar de novo.'
        : FALLBACK[action];
    case 401:
      return 'Sua sessão expirou. Entre novamente para continuar.';
    case 403:
      // Na criação, 403 = limite de vagas ativas do plano; o back explica o limite.
      if (action === 'create') {
        return apiMessage(error) ?? 'Você atingiu o limite de vagas ativas do seu plano.';
      }
      return 'Esta conta não tem permissão para isso. Entre com a conta do restaurante dono da vaga.';
    case 404:
      return 'Esta vaga não existe mais. Atualize a página.';
    case 409:
      return action === 'edit'
        ? 'A vaga foi alterada ao mesmo tempo em outro lugar. Tente novamente.'
        : 'A vaga foi alterada em outra aba. Atualize a página e tente de novo.';
    case 422:
      if (action === 'edit') {
        return apiMessage(error) ?? 'Esta vaga está encerrada e não pode mais ser editada.';
      }
      return action === 'close' ? 'Esta vaga já está encerrada.' : FALLBACK[action];
    case 429:
      return 'Muitas tentativas. Aguarde um instante e tente novamente.';
    default:
      return FALLBACK[action];
  }
}
