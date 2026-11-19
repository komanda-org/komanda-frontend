import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LocationService, NOMINATIM_INTERVAL_MS } from './location.service';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const BRASIL_API = 'https://brasilapi.com.br/api/cep/v2/';

describe('LocationService', () => {
  let service: LocationService;
  let http: HttpTestingController;
  let storage: Map<string, string>;

  const flushMicrotasks = () => vi.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    vi.useFakeTimers();
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('uses BrasilAPI first, also for CEPs ending in 000, and caches the result', async () => {
    const result = service.getRestaurantCoordinates('01001-000', 'Rua das Flores, 123 - Centro, São Paulo - SP');
    await flushMicrotasks();
    http.expectOne(`${BRASIL_API}01001000`).flush({
      location: { coordinates: { latitude: '-23.5475', longitude: '-46.63611' } },
    });

    await expect(result).resolves.toEqual({ lat: -23.5475, lng: -46.63611 });
    await expect(
      service.getRestaurantCoordinates('01001-000', 'Rua das Flores, 123 - Centro, São Paulo - SP'),
    ).resolves.toEqual({ lat: -23.5475, lng: -46.63611 });
    expect([...storage.keys()][0]).toMatch(/^komanda_geo_v2_01001-000_/);
  });

  it('falls back to the address in Brazil, without forcing a state', async () => {
    const result = service.getRestaurantCoordinates('45820-000', 'Rua A, Eunápolis - BA');
    await flushMicrotasks();
    http.expectOne(`${BRASIL_API}45820000`).flush({ location: { coordinates: {} } });
    await flushMicrotasks();

    const request = http.expectOne((r) => r.url.startsWith(NOMINATIM));
    expect(request.request.url).toContain(encodeURIComponent('Rua A, Eunápolis - BA, Brasil'));
    expect(request.request.url).not.toContain('Bahia');
    request.flush([{ lat: '-16.3711', lon: '-39.5806' }]);

    await expect(result).resolves.toEqual({ lat: -16.3711, lng: -39.5806 });
  });

  it('queues Nominatim calls to at most one per second', async () => {
    const first = service.getRestaurantCoordinates(undefined, 'Rua A, São Paulo');
    const second = service.getRestaurantCoordinates(undefined, 'Rua B, São Paulo');
    await flushMicrotasks();

    http.expectOne((r) => r.url.includes('Rua%20A')).flush([{ lat: '-23.5', lon: '-46.6' }]);
    await flushMicrotasks();
    http.expectNone((r) => r.url.includes('Rua%20B'));

    await vi.advanceTimersByTimeAsync(NOMINATIM_INTERVAL_MS);
    http.expectOne((r) => r.url.includes('Rua%20B')).flush([]);

    await expect(first).resolves.toEqual({ lat: -23.5, lng: -46.6 });
    await expect(second).resolves.toBeNull();
  });

  it('does not persist failed lookups, so a reload tries again', async () => {
    const result = service.getRestaurantCoordinates(undefined, 'Endereço inexistente');
    await flushMicrotasks();
    http.expectOne((r) => r.url.startsWith(NOMINATIM)).flush([]);

    await expect(result).resolves.toBeNull();
    expect(storage.size).toBe(0);
    await expect(service.getRestaurantCoordinates(undefined, 'Endereço inexistente')).resolves.toBeNull();
  });

  it('reports a denied geolocation separately from an unavailable one', async () => {
    const getCurrentPosition = vi.fn((_ok: unknown, fail: (e: object) => void) =>
      fail({ code: 1, PERMISSION_DENIED: 1 }),
    );
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });

    await expect(service.getUserLocation()).resolves.toEqual({ status: 'denied' });

    getCurrentPosition.mockImplementation((_ok, fail) => fail({ code: 3, PERMISSION_DENIED: 1 }));
    await expect(service.getUserLocation()).resolves.toEqual({ status: 'unavailable' });
  });

  it('calculates the Haversine distance rounded to one decimal place', () => {
    expect(
      service.calculateDistanceKm({ lat: -23.5505, lng: -46.6333 }, { lat: -23.5605, lng: -46.6333 }),
    ).toBe(1.1);
  });
});
