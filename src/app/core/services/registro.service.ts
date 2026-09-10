import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RegistrarProfissionalPayload,
  RegistrarRestaurantePayload,
  RegistroResposta,
} from '../models/registro.model';

/**
 * A unica porta de entrada para as rotas de registro.
 *
 * `providedIn: 'root'` = existe UMA instancia deste service na aplicacao toda
 * (singleton), criada sob demanda. E o Angular quem constroi e injeta; nunca
 * damos `new RegistroService()`.
 *
 * Por que o componente nao chama o HttpClient direto? Porque a URL da rota e
 * um detalhe de infraestrutura. Isolando aqui, o dia em que a rota mudar de
 * /professionals para /v2/professionals, muda-se uma linha — e nenhuma tela.
 */
@Injectable({ providedIn: 'root' })
export class RegistroService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /**
   * POST /professionals
   *
   * Devolve Observable, nao Promise. Diferenca pratica: o Observable e "frio" —
   * a requisicao so dispara quando alguem faz `.subscribe()`. Uma Promise
   * dispararia na hora da criacao. Isso e o que permite cancelar a chamada.
   */
  registrarProfissional(
    payload: RegistrarProfissionalPayload,
  ): Observable<RegistroResposta> {
    return this.http.post<RegistroResposta>(`${this.base}/professionals`, payload);
  }

  /** POST /restaurantes/cadastro */
  registrarRestaurante(
    payload: RegistrarRestaurantePayload,
  ): Observable<RegistroResposta> {
    return this.http.post<RegistroResposta>(`${this.base}/restaurantes/cadastro`, payload);
  }
}
