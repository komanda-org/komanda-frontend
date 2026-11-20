import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PublicProfessionalProfile, ReviewsPage } from '../models/profile.model';

export const REVIEWS_PAGE_SIZE = 10;
// Limite do DTO de GET /users/:id/reviews.
const REVIEWS_MAX_TAKE = 50;

@Injectable({ providedIn: 'root' })
export class ProfessionalsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getById(id: string): Observable<PublicProfessionalProfile> {
    return this.http.get<PublicProfessionalProfile>(`${this.base}/professionals/${encodeURIComponent(id)}`);
  }

  listReviews(userId: string, skip = 0, take = REVIEWS_PAGE_SIZE): Observable<ReviewsPage> {
    const params = new HttpParams()
      .set('skip', Math.max(0, skip))
      .set('take', Math.min(Math.max(1, take), REVIEWS_MAX_TAKE));
    return this.http.get<ReviewsPage>(`${this.base}/users/${encodeURIComponent(userId)}/reviews`, { params });
  }
}
