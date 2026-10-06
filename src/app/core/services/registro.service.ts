import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RegistrarProfissionalPayload,
  RegistrarRestaurantePayload,
  RegistroProfissionalResposta,
  RegistroRestauranteResposta,
} from '../models/registro.model';

/**
 * A unica porta de entrada para as rotas de registro. A URL da rota e detalhe
 * de infraestrutura: se um dia virar /v2/professionals, muda-se uma linha e
 * nenhuma tela.
 */
@Injectable({ providedIn: 'root' })
export class RegistroService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /**
   * POST /professionals. Observable e frio: a requisicao dispara no
   * `.subscribe()` (e pode ser cancelada); uma Promise dispararia na criacao.
   */
  registrarProfissional(
    payload: RegistrarProfissionalPayload,
  ): Observable<RegistroProfissionalResposta> {
    return this.http.post<RegistroProfissionalResposta>(
      `${this.base}/professionals`,
      payload,
    );
  }

  /** POST /restaurants */
  registrarRestaurante(
    payload: RegistrarRestaurantePayload,
  ): Observable<RegistroRestauranteResposta> {
    return this.http.post<RegistroRestauranteResposta>(
      `${this.base}/restaurants`,
      payload,
    );
  }
}
