/**
 * Development configuration.
 *
 * `apiUrl` is '/api' — a relative path, not an absolute URL. The Angular dev
 * server proxies everything under /api to http://localhost:3000 (see
 * proxy.conf.json), so the browser sees same-origin requests and CORS never
 * comes into play.
 */
export const environment = {
  production: false,
  apiUrl: '/api',
};
