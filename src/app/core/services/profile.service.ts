import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ProfessionalProfile,
  Review,
  ReviewsPage,
  UpdateProfilePayload,
  UpdateProfileResponse,
} from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getMe(): Observable<ProfessionalProfile> {
    return this.http.get<ProfessionalProfile>(`${this.base}/users/me`);
  }

  updateMe(payload: UpdateProfilePayload): Observable<ProfessionalProfile> {
    return this.http
      .put<UpdateProfileResponse>(`${this.base}/users/me`, payload)
      .pipe(map((response) => response.profile));
  }

  listReviews(userId: string): Observable<Review[]> {
    return this.http
      .get<ReviewsPage>(`${this.base}/users/${encodeURIComponent(userId)}/reviews`)
      .pipe(map((page) => page.data));
  }
}
