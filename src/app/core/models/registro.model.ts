/**
 * O CONTRATO das duas rotas de registro (POST /api/professionals e
 * /api/restaurants), conforme o back-end real. Campos em ingles porque e
 * assim que o payload viaja na API — o resto do front fala portugues.
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
  /** Obrigatorio na API: e por ele que o feed calcula a distancia das vagas. */
  zipCode: string;
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
 * Papel do usuario (enum `Role` do Prisma). Uniao de literais em vez de
 * `string` para que um typo seja erro de compilacao, nao bug de runtime.
 */
export type PapelUsuario = 'PROFISSIONAL' | 'RESTAURANTE';

/**
 * O nucleo que os DOIS cadastros devolvem.
 *
 * `createdAt` e string, nao Date: JSON nao tem tipo data, o back serializa para
 * ISO e o HttpClient entrega exatamente isso — tipar como Date deixaria
 * `createdAt.getFullYear()` compilar e quebrar em runtime.
 */
export interface RegistroRespostaBase {
  userId: string;
  email: string;
  role: PapelUsuario;
  createdAt: string;
}

/**
 * Resposta de POST /professionals. Redeclarar `role` estreita o tipo herdado:
 * aqui ele deixa de ser a uniao e vira so 'PROFISSIONAL'.
 */
export interface RegistroProfissionalResposta extends RegistroRespostaBase {
  role: 'PROFISSIONAL';
  fullName: string;
  mainRole: string;
}

/**
 * Resposta de POST /restaurants.
 *
 * `cnpj` volta SEM mascara: o use-case do back faz `.replace(/\D/g, '')` antes
 * de gravar ("11.222.333/0001-81" -> "11222333000181"). Quem exibir, mascara.
 */
export interface RegistroRestauranteResposta extends RegistroRespostaBase {
  role: 'RESTAURANTE';
  restaurantName: string;
  cnpj: string;
  phone: string;
  cuisineType: string;
  description: string;
  address: string;
  zipCode: string;
  /** Ausente quando o restaurante nao enviou logo. */
  logoUrl?: string;
}
