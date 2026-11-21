import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateReviewPayload, Review } from '../models/profile.model';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'komanda:reviews:reviewed';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;
  // Mantemos sincronizado com localStorage para persistir entre recarregamentos de pagina.
  private readonly reviewed = signal<ReadonlySet<string>>(this.loadInitial());

  create(payload: CreateReviewPayload): Observable<Review> {
    return this.http.post<Review>(`${this.base}/users/reviews`, payload);
  }

  isReviewed(jobId: string, receiverId: string): boolean {
    return this.reviewed().has(this.key(jobId, receiverId));
  }

  markReviewed(jobId: string, receiverId: string): void {
    const key = this.key(jobId, receiverId);
    this.reviewed.update((keys) => {
      const updated = new Set(keys).add(key);
      this.save(updated);
      return updated;
    });
  }

  // Inclui quem avalia: outra conta na mesma aba nao herda o "Avaliado".
  private key(jobId: string, receiverId: string): string {
    return `${this.auth.getUser()?.id ?? ''}:${jobId}:${receiverId}`;
  }

  private loadInitial(): Set<string> {
    try {
      if (typeof localStorage === 'undefined') {
        return new Set();
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  }

  private save(keys: ReadonlySet<string>): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(keys)));
      }
    } catch {
      // Falha de storage silenciosa (ex: quota ou navegacao privada restritiva)
    }
  }
}
