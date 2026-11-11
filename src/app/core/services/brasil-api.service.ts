import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface BrasilApiCepResponse {
  cep: string;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  street: string | null;
}

export interface BrasilApiCnpjResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  descricao_situacao_cadastral: string | null;
  situacao_cadastral: number | string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  ddd_telefone_1: string | null;
}

@Injectable({ providedIn: 'root' })
export class BrasilApiService {
  private readonly http = inject(HttpClient);
  private readonly base = 'https://brasilapi.com.br/api';

  consultarCep(cep: string): Observable<BrasilApiCepResponse> {
    return this.http.get<BrasilApiCepResponse>(`${this.base}/cep/v2/${cep}`);
  }

  consultarCnpj(cnpj: string): Observable<BrasilApiCnpjResponse> {
    return this.http.get<BrasilApiCnpjResponse>(`${this.base}/cnpj/v1/${cnpj}`);
  }
}
