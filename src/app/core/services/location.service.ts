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

interface BrasilApiCepResponse {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  location?: {
    coordinates?: {
      latitude?: number | string;
      longitude?: number | string;
    };
  };
}

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

interface NominatimResult {
  lat?: string;
  lon?: string;
}

// v2: a v1 gravava `null` de buscas que falhavam e travava a distancia para sempre.
const CACHE_PREFIX = 'komanda_geo_v2_';
// Politica de uso do Nominatim: no maximo 1 requisicao por segundo.
export const NOMINATIM_INTERVAL_MS = 1100;

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly inFlightLookups = new Map<string, Promise<Coordinates | null>>();
  // Falha fica so na memoria da sessao: um F5 tenta de novo.
  private readonly failedLookups = new Set<string>();
  private nominatimQueue: Promise<unknown> = Promise.resolve();
  private lastNominatimAt = 0;

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
        this.http.get<BrasilApiCepResponse>(
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

  getRestaurantCoordinates(zipCode?: string, address?: string): Promise<Coordinates | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve(null);
    }

    const cacheKey = `${CACHE_PREFIX}${zipCode ?? ''}_${address ?? ''}`;
    if (this.failedLookups.has(cacheKey)) {
      return Promise.resolve(null);
    }
    const cachedCoordinates = this.readCache(cacheKey);
    if (cachedCoordinates) {
      return Promise.resolve(cachedCoordinates);
    }

    const inFlight = this.inFlightLookups.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const lookup = this.lookupRestaurant(zipCode, address)
      .then((coordinates) => {
        if (coordinates) {
          this.writeCache(cacheKey, coordinates);
        } else {
          this.failedLookups.add(cacheKey);
        }
        return coordinates;
      })
      .finally(() => this.inFlightLookups.delete(cacheKey));
    this.inFlightLookups.set(cacheKey, lookup);
    return lookup;
  }

  calculateDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
    const radians = (degrees: number): number => (degrees * Math.PI) / 180;
    const latitudeDelta = radians(coord2.lat - coord1.lat);
    const longitudeDelta = radians(coord2.lng - coord1.lng);
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(radians(coord1.lat)) *
        Math.cos(radians(coord2.lat)) *
        Math.sin(longitudeDelta / 2) ** 2;
    const boundedHaversine = Math.min(1, Math.max(0, haversine));
    const distance =
      6371 *
      2 *
      Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine));
    return Number(distance.toFixed(1));
  }

  private async lookupRestaurant(
    zipCode?: string,
    address?: string,
  ): Promise<Coordinates | null> {
    const normalizedZipCode = zipCode?.replace(/\D/g, '');
    if (normalizedZipCode?.length === 8) {
      const coordinates = await this.getBrasilApiCoordinates(normalizedZipCode);
      if (coordinates) {
        return coordinates;
      }
    }

    const normalizedAddress = address?.trim();
    return normalizedAddress
      ? this.throttleNominatim(() => this.getNominatimCoordinates(normalizedAddress))
      : null;
  }

  private async getBrasilApiCoordinates(zipCode: string): Promise<Coordinates | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<BrasilApiCepResponse>(`https://brasilapi.com.br/api/cep/v2/${zipCode}`),
      );
      return this.toCoordinates(
        response.location?.coordinates?.latitude,
        response.location?.coordinates?.longitude,
      );
    } catch (error: unknown) {
      console.warn('Não foi possível obter coordenadas do CEP pela BrasilAPI.', error);
      return null;
    }
  }

  private async getNominatimCoordinates(address: string): Promise<Coordinates | null> {
    const query = encodeURIComponent(`${address}, Brasil`);
    try {
      const results = await firstValueFrom(
        this.http.get<NominatimResult[]>(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
        ),
      );
      return this.toCoordinates(results[0]?.lat, results[0]?.lon);
    } catch (error: unknown) {
      console.warn('Não foi possível localizar o endereço no OpenStreetMap.', error);
      return null;
    }
  }

  private throttleNominatim<T>(task: () => Promise<T>): Promise<T> {
    const run = this.nominatimQueue.then(async () => {
      const wait = this.lastNominatimAt + NOMINATIM_INTERVAL_MS - Date.now();
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      this.lastNominatimAt = Date.now();
      return task();
    });
    this.nominatimQueue = run.catch(() => undefined);
    return run;
  }

  private readCache(key: string): Coordinates | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return null;
      }

      const value: unknown = JSON.parse(raw);
      if (
        typeof value === 'object' &&
        value !== null &&
        'lat' in value &&
        'lng' in value &&
        typeof value.lat === 'number' &&
        typeof value.lng === 'number' &&
        Number.isFinite(value.lat) &&
        Number.isFinite(value.lng)
      ) {
        return { lat: value.lat, lng: value.lng };
      }
      return null;
    } catch (error: unknown) {
      console.warn('Não foi possível ler o cache de localização neste dispositivo.', error);
      return null;
    }
  }

  private writeCache(key: string, coordinates: Coordinates): void {
    try {
      localStorage.setItem(key, JSON.stringify(coordinates));
    } catch (error: unknown) {
      console.warn('Não foi possível salvar o cache de localização neste dispositivo.', error);
    }
  }

  private toCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
    if (
      (typeof latitude !== 'number' && typeof latitude !== 'string') ||
      (typeof longitude !== 'number' && typeof longitude !== 'string') ||
      latitude === '' ||
      longitude === ''
    ) {
      return null;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    return Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
      ? { lat, lng }
      : null;
  }
}
