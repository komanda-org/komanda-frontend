import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { ProfessionalPreferences } from '../models/professional-preferences.model';

const STORAGE_PREFIX = 'komanda.professionalPreferences.';

@Injectable({ providedIn: 'root' })
export class ProfessionalPreferencesService {
  private readonly platformId = inject(PLATFORM_ID);

  saveForEmail(email: string, preferences: ProfessionalPreferences): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      localStorage.setItem(this.storageKey(email), JSON.stringify(preferences));
    } catch (error: unknown) {
      console.warn(
        'Não foi possível salvar as preferências profissionais neste dispositivo.',
        error,
      );
    }
  }

  getForEmail(email: string | undefined): ProfessionalPreferences | null {
    if (!isPlatformBrowser(this.platformId) || !email) {
      return null;
    }

    try {
      const key = this.storageKey(email);
      const raw = localStorage.getItem(key);
      if (!raw) {
        return null;
      }

      const value: unknown = JSON.parse(raw);
      if (!this.isPreferences(value)) {
        localStorage.removeItem(key);
        return null;
      }

      return value;
    } catch (error: unknown) {
      console.warn('Não foi possível ler as preferências profissionais neste dispositivo.', error);
      return null;
    }
  }

  private storageKey(email: string): string {
    return `${STORAGE_PREFIX}${email.trim().toLocaleLowerCase('en-US')}`;
  }

  private isPreferences(value: unknown): value is ProfessionalPreferences {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const preferences = value as Partial<ProfessionalPreferences>;
    return (
      typeof preferences.mainRole === 'string' &&
      Array.isArray(preferences.interestedRoles) &&
      preferences.interestedRoles.every((role) => typeof role === 'string') &&
      (preferences.contractType === 'CLT' ||
        preferences.contractType === 'PJ' ||
        preferences.contractType === 'Freelancer')
    );
  }
}
