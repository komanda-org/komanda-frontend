/**
 * O CONTRATO das duas rotas de registro, conforme o Swagger:
 * POST /api/professionals e POST /api/restaurants.
 *
 * Os nomes dos campos estao em ingles porque e assim que o payload viaja na
 * especificacao. O resto do front fala portugues; a fronteira e aqui.
 */

/** O que o usuario escolhe na primeira decisao da pagina. */
export type TipoConta = 'profissional' | 'restaurante';

/** POST /professionals */
export interface RegistrarProfissionalPayload {
  email: string;
  password: string;
  fullName: string;
  mainRole: string;
  /** Opcionais: `?` significa que a chave pode simplesmente nao existir no objeto. */
  interestedRoles?: string[];
  experienceSummary?: string;
  profilePhoto?: string;
  neighborhood?: string;
  zipCode?: string;
}

/** POST /restaurants */
export interface RegistrarRestaurantePayload {
  email: string;
  password: string;
  restaurantName: string;
  /** Formato mascarado XX.XXX.XXX/XXXX-XX, conforme a especificacao. */
  cnpj: string;
  cuisineType: string;
  description: string;
  address: string;
  phone: string;
  zipCode: string;
  logoUrl?: string;
}

/**
 * Resposta de sucesso. A especificacao nao detalha o corpo, entao mantemos o
 * minimo que qualquer cadastro devolve — e a tela nao depende de nada alem disso.
 */
export interface RegistroResposta {
  id: string;
  email: string;
}
