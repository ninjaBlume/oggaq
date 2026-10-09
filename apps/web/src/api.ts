import { ApiClient, xsrfCookie } from '@oggaq/api-client';
import { apiUrl } from './config';

export const api = new ApiClient(apiUrl, {
  csrfToken: () => xsrfCookie(document.cookie),
  onSessionExpired: () => window.dispatchEvent(new Event('session-expired')),
});
