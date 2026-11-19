import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { RestaurantsService } from './restaurants.service';

describe('RestaurantsService', () => {
  let service: RestaurantsService;

  beforeEach(() => {
    service = TestBed.inject(RestaurantsService);
  });

  it('returns the restaurant and its open jobs by slug', async () => {
    const restaurant = await firstValueFrom(service.getBySlug('l-atelier-des-sens'));
    const jobs = await firstValueFrom(service.listOpenJobs('l-atelier-des-sens'));

    expect(restaurant.restaurantName).toBe("L'Atelier des Sens");
    expect(jobs.map((job) => job.title)).toEqual(['Chef de Partie', 'Sommelier Pleno']);
  });

  it('fails with a normalized 404 for an unknown slug', async () => {
    await expect(firstValueFrom(service.getBySlug('nao-existe'))).rejects.toMatchObject({ status: 404 });
    await expect(firstValueFrom(service.listOpenJobs('nao-existe'))).rejects.toMatchObject({ status: 404 });
  });
});
