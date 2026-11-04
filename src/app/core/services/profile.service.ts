import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfessionalProfile, Review } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getMe(): Observable<ProfessionalProfile> {
    return this.http.get<ProfessionalProfile>(`${this.base}/users/me`);
  }

  listReviews(userId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.base}/users/${encodeURIComponent(userId)}/reviews`);
  }
}
