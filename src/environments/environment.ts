/**
 * Configuracao de DESENVOLVIMENTO.
 *
 * `apiUrl` e '/api' — caminho relativo, nao URL absoluta. Isso e proposital:
 * o dev-server do Angular intercepta tudo que comeca com /api e repassa para
 * http://localhost:3000 (ver proxy.conf.json na raiz).
 *
 * Para o browser a requisicao sai para a MESMA origem (localhost:4200),
 * entao o CORS nao entra em cena.
 */
export const environment = {
  producao: false,
  apiUrl: '/api',
};
