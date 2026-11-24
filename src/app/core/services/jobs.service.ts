import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Job, JobsResponse } from '../models/jobs.model';

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(): Observable<JobsResponse> {
    return this.http.get<JobsResponse>(`${this.base}/jobs`);
  }

  getById(id: string): Observable<Job> {
    return this.http.get<Job>(`${this.base}/jobs/${encodeURIComponent(id)}`);
  }

  search(params: {
    query?: string;
    contractType?: string;
    shift?: string;
    minSalary?: number;
    lat?: number;
    lng?: number;
    maxDistanceKm?: number;
    skip?: number;
    take?: number;
  }): Observable<JobsResponse> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return this.http.get<JobsResponse>(`${this.base}/jobs/search`, { params: httpParams });
  }
}
