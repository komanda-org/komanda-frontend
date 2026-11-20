import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from './shared/ui/toast';

/**
 * Raiz da aplicacao.
 *
 * Ela nao desenha nada por conta propria: so hospeda o <router-outlet>, o
 * buraco onde o Router encaixa o componente da rota atual. Quando existir um
 * cabecalho ou menu comum a todas as telas, e aqui que ele entra — em volta
 * do outlet.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
