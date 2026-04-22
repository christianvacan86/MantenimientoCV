import config from './app.config';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const res = await fetch(`${config.apiBase}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err  = new Error(body.detail || `Error HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Uso: import { api } from '../config/api';
// api.get('/api/activos/')
// api.post('/api/activos/', { nombre: '...' })
// api.put('/api/activos/1', { nombre: '...' })
// api.delete('/api/activos/1')
export const api = {
  get:    (path)       => request(path),
  post:   (path, body) => request(path, { method: 'POST',   headers: JSON_HEADERS, body: JSON.stringify(body) }),
  put:    (path, body) => request(path, { method: 'PUT',    headers: JSON_HEADERS, body: JSON.stringify(body) }),
  delete: (path)       => request(path, { method: 'DELETE' }),
};
