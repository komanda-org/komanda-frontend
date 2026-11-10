import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;
  let http: HttpTestingController;
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    service = TestBed.inject(LocationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  it('uses the address lookup for city-wide CEPs and caches the result', async () => {
    const address = 'Rua A, Eunápolis';
    const result = service.getRestaurantCoordinates('45820-000', address);
    const request = http.expectOne(
      'https://nominatim.openstreetmap.org/search?format=json&q=Rua%20A%2C%20Eun%C3%A1polis%2C%20Bahia%2C%20Brasil&limit=1',
    );
    expect(request.request.url).not.toContain('brasilapi.com.br');
    request.flush([{ lat: '-16.3711', lon: '-39.5806' }]);

    await expect(result).resolves.toEqual({ lat: -16.3711, lng: -39.5806 });
    await expect(service.getRestaurantCoordinates('45820-000', address)).resolves.toEqual({
      lat: -16.3711,
      lng: -39.5806,
    });
    expect(storage.get('komanda_geo_45820-000_Rua A, Eunápolis')).toContain('-16.3711');
  });

  it('uses BrasilAPI coordinates for a specific CEP', async () => {
    const result = service.getRestaurantCoordinates('01001-001', 'Praça da Sé');
    const request = http.expectOne('https://brasilapi.com.br/api/cep/v2/01001001');
    request.flush({
      location: { coordinates: { latitude: '-23.5505', longitude: '-46.6333' } },
    });

    await expect(result).resolves.toEqual({ lat: -23.5505, lng: -46.6333 });
  });

  it('calculates the Haversine distance rounded to one decimal place', () => {
    expect(
      service.calculateDistanceKm({ lat: -23.5505, lng: -46.6333 }, { lat: -23.5605, lng: -46.6333 }),
    ).toBe(1.1);
  });
});
