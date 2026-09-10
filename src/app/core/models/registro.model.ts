/**
 * O CONTRATO das duas rotas de registro.
 *
 * ATENCAO: no back-end atual (NestJS em ../src) estas rotas AINDA NAO EXISTEM —
 * hoje existe apenas POST /portaria/porteiros. Os tipos abaixo espelham a
 * especificacao da task. Quando o back-end for implementado, nada aqui muda.
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

/** POST /restaurantes/cadastro */
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
