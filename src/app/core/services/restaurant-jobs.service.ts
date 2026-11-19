import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApplicationStatus } from '../models/applications.model';
import {
  Applicant,
  ApplicantsPage,
  CreateJobPayload,
  JobOverview,
  JobStatus,
  RestaurantJob,
  RestaurantJobsPage,
  UpdateJobPayload,
} from '../models/restaurant-jobs.model';

/** Maior `take` aceito pela API nas listas paginadas. */
const MAX_TAKE = 50;

@Injectable({ providedIn: 'root' })
export class RestaurantJobsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listMine(): Observable<RestaurantJob[]> {
    return this.http
      .get<RestaurantJobsPage>(`${this.base}/users/me/jobs`, { params: { take: MAX_TAKE } })
      .pipe(map((page) => page.data));
  }

  create(payload: CreateJobPayload): Observable<RestaurantJob> {
    return this.http.post<RestaurantJob>(`${this.base}/jobs`, payload);
  }

  updateJob(jobId: string, changes: UpdateJobPayload): Observable<RestaurantJob> {
    return this.http.patch<RestaurantJob>(`${this.base}/jobs/${jobId}`, changes);
  }

  updateStatus(jobId: string, status: JobStatus): Observable<RestaurantJob> {
    return this.http.patch<RestaurantJob>(`${this.base}/jobs/${jobId}/status`, { status });
  }

  listApplicants(jobId: string): Observable<Applicant[]> {
    return this.http
      .get<ApplicantsPage>(`${this.base}/jobs/${jobId}/applications`, { params: { take: MAX_TAKE } })
      .pipe(map((page) => page.data));
  }

  updateApplicantStatus(
    jobId: string,
    applicationId: string,
    status: ApplicationStatus,
  ): Observable<unknown> {
    return this.http.patch(`${this.base}/jobs/${jobId}/applications/${applicationId}/status`, {
      status,
    });
  }

  /** Vagas do restaurante com os candidatos de cada uma: a API nao tem endpoint de resumo. */
  overview(): Observable<JobOverview[]> {
    return this.listMine().pipe(
      switchMap((jobs) =>
        jobs.length === 0
          ? of([])
          : forkJoin(
              jobs.map((job) =>
                this.listApplicants(job.id).pipe(map((applicants) => ({ job, applicants }))),
              ),
            ),
      ),
    );
  }
}
