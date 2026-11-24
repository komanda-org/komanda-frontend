import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type UserLocation =
  | { status: 'granted'; coordinates: Coordinates }
  | { status: 'denied' | 'unavailable' };

export interface BrasilApiCepData {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface BrasilApiCnpjData {
  nome_fantasia?: string;
  razao_social?: string;
  ddd_telefone_1?: string;
  cep?: string;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  getUserLocation(): Promise<UserLocation> {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) {
      return Promise.resolve({ status: 'unavailable' });
    }

    return new Promise<UserLocation>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({ status: 'granted', coordinates: { lat: coords.latitude, lng: coords.longitude } }),
        (error) =>
          resolve({ status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    });
  }

  async getCep(zipCode: string): Promise<BrasilApiCepData | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const normalizedZipCode = zipCode.replace(/\D/g, '');
    if (normalizedZipCode.length !== 8) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<BrasilApiCepData>(
          `https://brasilapi.com.br/api/cep/v2/${normalizedZipCode}`,
        ),
      );
      return {
        street: response.street,
        neighborhood: response.neighborhood,
        city: response.city,
        state: response.state,
      };
    } catch (error: unknown) {
      console.warn('Não foi possível consultar o CEP pela BrasilAPI.', error);
      return null;
    }
  }

  async getCnpj(cnpj: string): Promise<BrasilApiCnpjData | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const normalizedCnpj = cnpj.replace(/\D/g, '');
    if (normalizedCnpj.length !== 14) {
      return null;
    }

    try {
      return await firstValueFrom(
        this.http.get<BrasilApiCnpjData>(
          `https://brasilapi.com.br/api/cnpj/v1/${normalizedCnpj}`,
        ),
      );
    } catch (error: unknown) {
      console.warn('Não foi possível consultar o CNPJ pela BrasilAPI.', error);
      return null;
    }
  }
}
