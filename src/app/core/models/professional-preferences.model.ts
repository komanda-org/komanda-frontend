export type PreferredContractType = 'CLT' | 'PJ' | 'FREELANCER' | 'ESTAGIO' | 'Freelancer';

export interface ProfessionalPreferences {
  mainRole: string;
  interestedRoles: string[];
  contractType?: PreferredContractType;
}
