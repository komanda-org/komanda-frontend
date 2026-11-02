import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginPayload, LoginResponse } from '../models/auth.model';

const TOKEN_KEY = 'komanda.accessToken';
const USER_KEY = 'komanda.user';

/**
 * The single entry point for authentication.
 *
 * `providedIn: 'root'` = one singleton instance for the whole app, built by
 * Angular on demand.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = environment.apiUrl;

  /**
   * POST /auth/login
   *
   * The session is stored as a side effect of a successful response, so every
   * caller gets it for free instead of repeating the same two localStorage
   * writes.
   */
  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/auth/login`, payload)
      .pipe(tap((response) => this.storeSession(response, payload.email)));
  }

  logout(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (error: unknown) {
      console.warn('Não foi possível limpar a sessão neste dispositivo.', error);
    }
  }

  getUser(): AuthUser | null {
    // localStorage doesn't exist during SSR: the page renders on the server
    // before ever reaching the browser.
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch (error: unknown) {
      // A corrupt or outdated value would throw here on every change detection
      // pass — the template calls getUser() through user() — leaving a blank
      // page with no reachable logout to clear it. Return no session instead.
      console.warn('Não foi possível ler a sessão neste dispositivo.', error);
      this.logout();
      return null;
    }
  }

  private storeSession(response: LoginResponse, email: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // localStorage throws when site data is blocked (Safari private browsing)
    // or the quota is full. This runs inside the `tap` of login(), so an
    // unguarded throw would turn a successful 200 into a login error.
    try {
      localStorage.setItem(TOKEN_KEY, response.access_token);
      localStorage.setItem(
        USER_KEY,
        JSON.stringify({ ...response.user, email: email.trim().toLocaleLowerCase('en-US') }),
      );
    } catch {
      // Nothing gets persisted, but the credentials were accepted: let the
      // caller through rather than reporting a failure that didn't happen.
    }
  }
}
