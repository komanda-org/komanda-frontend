import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;
  let http: HttpTestingController;

  beforeEach(() => {
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

  it('returns the browser coordinates when the location is granted', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: (p: object) => void) => ok({ coords: { latitude: -12.97, longitude: -38.5 } }),
      },
    });

    await expect(service.getUserLocation()).resolves.toEqual({
      status: 'granted',
      coordinates: { lat: -12.97, lng: -38.5 },
    });
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
});
