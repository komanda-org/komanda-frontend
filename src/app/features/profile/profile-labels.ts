import { Mobility, WorkModel } from '../../core/models/profile.model';

export const WORK_MODELS: readonly WorkModel[] = ['CLT', 'PJ', 'FREELANCER', 'TEMPORARIO'];
export const MOBILITIES: readonly Mobility[] = ['LOCAL', 'REGIONAL', 'NACIONAL', 'INTERNACIONAL'];

export const BRAZIL_STATES: readonly { code: string; name: string }[] = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
];

export function workModelLabel(model: WorkModel): string {
  switch (model) {
    case 'CLT':
      return 'CLT';
    case 'PJ':
      return 'PJ';
    case 'FREELANCER':
      return 'Freelance';
    case 'TEMPORARIO':
      return 'Temporário';
  }
}

export function mobilityLabel(mobility: Mobility): string {
  switch (mobility) {
    case 'LOCAL':
      return 'Local';
    case 'REGIONAL':
      return 'Regional';
    case 'NACIONAL':
      return 'Nacional';
    case 'INTERNACIONAL':
      return 'Internacional';
  }
}
