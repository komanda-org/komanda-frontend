import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Me,
  ProfessionalProfile,
  Review,
  ReviewsPage,
  UpdateProfilePayload,
  UpdateProfileResponse,
  UpdateRestaurantPayload,
  UpdateRestaurantResponse,
} from '../models/profile.model';
import { AuthService } from './auth.service';

/** Ultima foto salva nesta aba, de qual conta; `undefined` = nada mudou desde o GET /users/me. */
export type PhotoChange = { userId: string; url: string | null } | undefined;

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly auth = inject(AuthService);

  // O menu lateral le o /me uma vez so; este sinal troca o avatar dele sem recarregar a pagina.
  private readonly photoChangeState = signal<PhotoChange>(undefined);
  readonly photoChange = this.photoChangeState.asReadonly();

  getMe(): Observable<Me> {
    return this.http.get<Me>(`${this.base}/users/me`);
  }

  updateMe(payload: UpdateProfilePayload): Observable<ProfessionalProfile> {
    return this.http
      .put<UpdateProfileResponse>(`${this.base}/users/me`, payload)
      .pipe(map((response) => response.profile));
  }

  updateRestaurant(payload: UpdateRestaurantPayload): Observable<UpdateRestaurantResponse['profile']> {
    return this.http
      .put<UpdateRestaurantResponse>(`${this.base}/users/me`, payload)
      .pipe(map((response) => response.profile));
  }

  /** Foto do profissional ou logo do restaurante, ja recortada. Devolve a nova URL. */
  uploadPhoto(image: Blob, fileName: string): Observable<string | null> {
    const body = new FormData();
    body.append('file', image, fileName);
    return this.http.post<{ url: string | null }>(`${this.base}/users/me/photo`, body).pipe(
      map((response) => response.url),
      tap((url) => this.setPhotoChange(url)),
    );
  }

  removePhoto(): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/users/me/photo`)
      .pipe(tap(() => this.setPhotoChange(null)));
  }

  listReviews(userId: string): Observable<Review[]> {
    return this.http
      .get<ReviewsPage>(`${this.base}/users/${encodeURIComponent(userId)}/reviews`)
      .pipe(map((page) => page.data));
  }

  private setPhotoChange(url: string | null): void {
    this.photoChangeState.set({ userId: this.auth.getUser()?.id ?? '', url });
  }
}
