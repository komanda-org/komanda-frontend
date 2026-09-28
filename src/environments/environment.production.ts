/**
 * Production configuration.
 *
 * Swapped in for environment.ts during production builds via angular.json's
 * fileReplacements. There is no dev-server proxy in production — a reverse
 * proxy (nginx/Caddy) serves the front-end and the API under the same domain.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
};
