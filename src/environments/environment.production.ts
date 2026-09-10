/**
 * Configuracao de PRODUCAO.
 *
 * Trocado no lugar de environment.ts em build de producao pelo
 * `fileReplacements` do angular.json. Em producao nao existe o proxy do
 * dev-server: quem faz esse papel e o reverse proxy (nginx/Caddy) servindo
 * front e API sob o mesmo dominio.
 */
export const environment = {
  producao: true,
  apiUrl: '/api',
};
