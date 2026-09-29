import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TipoConta } from '../../../core/models/registro.model';
import { Moldura } from '../../../shared/ui/moldura';

/**
 * Primeira tela do cadastro: "Como voce vai usar o Komanda?"
 *
 * Ela nao tem formulario nenhum — so guarda uma escolha e navega. Por isso e
 * uma ROTA propria e nao a etapa 1 de um wizard: o perfil decide qual dos dois
 * fluxos comeca, e cada fluxo tem numero de etapas diferente (3 e 2).
 */
@Component({
  selector: 'app-escolha-perfil',
  imports: [Moldura],
  templateUrl: './escolha-perfil.html',
  styleUrl: './escolha-perfil.scss',
})
export class EscolhaPerfil {
  private readonly router = inject(Router);

  protected readonly tipo = signal<TipoConta>('profissional');

  protected escolher(tipo: TipoConta): void {
    this.tipo.set(tipo);
  }

  protected continuar(): void {
    void this.router.navigate(['/registro', this.tipo()]);
  }

  protected sair(): void {
    void this.router.navigate(['/login']);
  }
}
