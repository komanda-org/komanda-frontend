import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { legacyChatRedirect } from './legacy-chat-redirect';

@Component({ template: '' })
class Blank {}

describe('legacyChatRedirect', () => {
  async function navigate(role: 'PROFISSIONAL' | 'RESTAURANTE'): Promise<string> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'mensagens', component: Blank },
          { path: 'mensagens/:jobId/:professionalId', component: Blank },
          { path: 'mensagens/:jobId', redirectTo: legacyChatRedirect },
        ]),
        { provide: AuthService, useValue: { getUser: () => ({ id: 'u1', role }) } },
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/mensagens/j1');
    return router.url;
  }

  it('completes the chat link with the logged professional id', async () => {
    expect(await navigate('PROFISSIONAL')).toBe('/mensagens/j1/u1');
  });

  it('sends a restaurant without a professional back to the list', async () => {
    expect(await navigate('RESTAURANTE')).toBe('/mensagens');
  });
});
