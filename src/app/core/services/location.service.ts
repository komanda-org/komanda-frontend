import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Coordinates {
  lat: number;
  lng: number;
}

interface BrasilApiCepResponse {
  location?: {
    coordinates?: {
      latitude?: number | string;
      longitude?: number | string;
    };
  };
}

interface NominatimResult {
  lat?: string;
  lon?: string;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly inFlightLookups = new Map<string, Promise<Coordinates | null>>();

  async getUserCoordinates(fallbackZipCode?: string): Promise<Coordinates | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const geolocation = navigator.geolocation;
    if (geolocation) {
      const coordinates = await new Promise<Coordinates | null>((resolve) => {
        geolocation.getCurrentPosition(
          ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        );
      });
      if (coordinates) {
        return coordinates;
      }
    }

    return fallbackZipCode ? this.getBrasilApiCoordinates(fallbackZipCode) : null;
  }

  getRestaurantCoordinates(zipCode?: string, address?: string): Promise<Coordinates | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve(null);
    }

    const cacheKey = `komanda_geo_${zipCode ?? ''}_${address ?? ''}`;
    const cachedCoordinates = this.readCache(cacheKey);
    if (cachedCoordinates !== undefined) {
      return Promise.resolve(cachedCoordinates);
    }

    const inFlight = this.inFlightLookups.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const lookup = this.lookupRestaurant(zipCode, address)
      .then((coordinates) => {
        this.writeCache(cacheKey, coordinates);
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
    if (normalizedZipCode?.length === 8 && !normalizedZipCode.endsWith('000')) {
      const coordinates = await this.getBrasilApiCoordinates(normalizedZipCode);
      if (coordinates) {
        return coordinates;
      }
    }

    const normalizedAddress = address?.trim();
    return normalizedAddress ? this.getNominatimCoordinates(normalizedAddress) : null;
  }

  private async getBrasilApiCoordinates(zipCode: string): Promise<Coordinates | null> {
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
    const query = encodeURIComponent(`${address}, Bahia, Brasil`);
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

  private readCache(key: string): Coordinates | null | undefined {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return undefined;
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
      return undefined;
    }
  }

  private writeCache(key: string, coordinates: Coordinates | null): void {
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
