import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Application } from '../models/jobs.model';

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  apply(jobId: string): Observable<Application> {
    return this.http.post<Application>(`${this.base}/jobs/${jobId}/applications`, {});
  }

  listMine(): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.base}/users/me/applications`);
  }
}
