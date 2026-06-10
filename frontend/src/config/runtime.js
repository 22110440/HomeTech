const normalizeOrigin = (origin) => origin.replace(/\/+$/, '');

export const BACKEND_ORIGIN = normalizeOrigin(
  import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:8080'
);

export const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE || `${BACKEND_ORIGIN}/api`)
  : `${BACKEND_ORIGIN}/api`;

export const WS_ENDPOINT = import.meta.env.DEV
  ? (import.meta.env.VITE_WS_ENDPOINT || `${BACKEND_ORIGIN}/ws`)
  : `${BACKEND_ORIGIN}/ws`;
