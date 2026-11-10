import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MyApplicationsPage } from '../models/applications.model';

/** Maior pagina que a API aceita (ListMyApplicationsQueryDto: @Max(50)). */
export const APPLICATIONS_MAX_TAKE = 50;

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(skip = 0, take = APPLICATIONS_MAX_TAKE): Observable<MyApplicationsPage> {
    return this.http.get<MyApplicationsPage>(`${this.base}/users/me/applications`, {
      params: { skip, take },
    });
  }
}
