import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MensagensChat } from './chat/mensagens-chat';
import { MensagensLista } from './lista/mensagens-lista';

/**
 * Duas colunas: a lista de conversas fica montada sempre e o painel da direita
 * mostra a conversa aberta — ou o estado vazio, quando nenhuma foi escolhida.
 * Por isso a rota mensagens/:jobId carrega este mesmo shell.
 */
@Component({
  selector: 'app-mensagens-shell',
  imports: [MensagensLista, MensagensChat],
  templateUrl: './mensagens-shell.html',
  styleUrl: './mensagens-shell.scss',
})
export class MensagensShell implements OnDestroy {
  readonly jobId = signal<string | null>(null);

  private readonly paramSub: Subscription;

  constructor() {
    const route = inject(ActivatedRoute);
    this.paramSub = route.paramMap.subscribe((params) => {
      this.jobId.set(params.get('jobId'));
    });
  }

  ngOnDestroy(): void {
    this.paramSub.unsubscribe();
  }
}
