export type PreferredContractType = 'CLT' | 'PJ' | 'Freelancer';

export interface ProfessionalPreferences {
  mainRole: string;
  interestedRoles: string[];
  contractType: PreferredContractType;
}
