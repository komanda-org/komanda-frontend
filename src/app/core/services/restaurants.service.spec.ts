import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RestaurantsService } from './restaurants.service';

describe('RestaurantsService', () => {
  let http: HttpTestingController;
  let service: RestaurantsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(RestaurantsService);
  });

  afterEach(() => http.verify());

  it('GETs the public profile by id, escaping the path segment', () => {
    let name = '';
    service.getById('701cce5e-1cc4').subscribe((restaurant) => (name = restaurant.restaurantName));

    const request = http.expectOne('/api/restaurants/701cce5e-1cc4');
    expect(request.request.method).toBe('GET');
    request.flush({ id: '701cce5e-1cc4', restaurantName: 'Cantina Bella Massa', openJobs: [] });
    expect(name).toBe('Cantina Bella Massa');

    service.getById('a/b').subscribe();
    http.expectOne('/api/restaurants/a%2Fb').flush({});
  });
});
