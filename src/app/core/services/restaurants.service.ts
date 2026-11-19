import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RestaurantPublicProfile } from '../models/restaurant.model';

@Injectable({ providedIn: 'root' })
export class RestaurantsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Perfil publico com as vagas abertas embutidas. */
  getById(id: string): Observable<RestaurantPublicProfile> {
    return this.http.get<RestaurantPublicProfile>(
      `${this.base}/restaurants/${encodeURIComponent(id)}`,
    );
  }
}
