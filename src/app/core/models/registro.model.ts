/**
 * O CONTRATO das duas rotas de registro, conforme o back-end real:
 * POST /api/professionals e POST /api/restaurants.
 *
 * Os nomes dos campos estao em ingles porque e assim que o payload viaja na
 * API. O resto do front fala portugues; a fronteira e aqui.
 *
 * Fonte da verdade (komanda-api):
 *   dto/create-professional.dto.ts  +  use-cases/register-professional.use-case.ts
 *   dto/create-restaurant.dto.ts    +  use-cases/register-restaurant.use-case.ts
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
 * O papel do usuario. No back e o enum `Role` do Prisma; aqui viaja como
 * string literal. Usamos uma uniao de literais (`'A' | 'B'`) em vez de `string`
 * para que um typo como 'PROFISIONAL' seja erro de compilacao, nao bug de runtime.
 */
export type PapelUsuario = 'PROFISSIONAL' | 'RESTAURANTE';

/**
 * O nucleo que os DOIS cadastros devolvem.
 *
 * `createdAt` e string, nao Date — de proposito. O back declara Date, mas entre
 * o Nest e o browser existe JSON, e JSON nao tem tipo data: o Date e serializado
 * como string ISO ("2026-09-23T14:02:11.000Z") e o HttpClient entrega exatamente
 * isso. Tipar como Date permitiria `resposta.createdAt.getFullYear()`, que
 * compila e quebra em runtime. Se algum dia precisarmos da data de verdade:
 * `new Date(resposta.createdAt)`.
 */
export interface RegistroRespostaBase {
  userId: string;
  email: string;
  role: PapelUsuario;
  createdAt: string;
}

/**
 * Resposta de POST /professionals.
 * `extends` = herda userId/email/role/createdAt e acrescenta o que e so daqui.
 *
 * Redeclarar `role` com o literal exato estreita o tipo herdado: dentro desta
 * interface, role nao e mais 'PROFISSIONAL' | 'RESTAURANTE', e so 'PROFISSIONAL'.
 */
export interface RegistroProfissionalResposta extends RegistroRespostaBase {
  role: 'PROFISSIONAL';
  fullName: string;
  mainRole: string;
}

/**
 * Resposta de POST /restaurants.
 *
 * ATENCAO ao `cnpj`: o use-case do back faz `dto.cnpj.replace(/\D/g, '')` antes
 * de gravar. Mandamos "11.222.333/0001-81" e recebemos de volta "11222333000181".
 * Se um dia alguem for exibir esse valor na tela, tem que mascarar de novo.
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
