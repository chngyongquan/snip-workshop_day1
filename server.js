import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const port = Number(Bun.env.PORT || 3000);
const publicDomain = Bun.env.RAILWAY_PUBLIC_DOMAIN;
const configuredBaseUrl = Bun.env.BASE_URL;
const baseUrl = configuredBaseUrl
  ? new URL(configuredBaseUrl).origin
  : publicDomain
    ? new URL(publicDomain.includes('://') ? publicDomain : `https://${publicDomain}`).origin
    : `http://localhost:${port}`;
const publicDir = Bun.env.PUBLIC_DIR ? resolve(Bun.env.PUBLIC_DIR) : null;
const links = new Map();
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type',
};

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(body, status = 200) {
  return withCors(new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  }));
}

function createCode() {
  let code = '';
  while (code.length < 6) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < 248) code += alphabet[byte % alphabet.length];
      if (code.length === 6) break;
    }
  }
  return code;
}

function createUniqueCode() {
  let code;
  do {
    code = createCode();
  } while (links.has(code));
  return code;
}

async function serveStatic(pathname) {
  if (!publicDir) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const filePath = resolve(publicDir, `.${requestedPath}`);
  if (filePath !== publicDir && !filePath.startsWith(`${publicDir}${sep}`)) return null;

  try {
    if (!(await stat(filePath)).isFile()) return null;
    return withCors(new Response(Bun.file(filePath)));
  } catch {
    return null;
  }
}

Bun.serve({
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (request.method === 'POST' && pathname === '/api/links') {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
      }

      if (typeof payload?.url !== 'string') {
        return jsonResponse({ error: 'A valid HTTP or HTTPS URL is required' }, 400);
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(payload.url);
      } catch {
        return jsonResponse({ error: 'A valid HTTP or HTTPS URL is required' }, 400);
      }
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return jsonResponse({ error: 'A valid HTTP or HTTPS URL is required' }, 400);
      }

      const code = createUniqueCode();
      const link = {
        code,
        url: payload.url,
        shortUrl: `${baseUrl}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);
      return jsonResponse(link, 201);
    }

    if (request.method === 'GET' && pathname === '/api/links') {
      return jsonResponse([...links.values()]);
    }

    if (request.method === 'GET') {
      const staticResponse = await serveStatic(pathname);
      if (staticResponse) return staticResponse;

      const code = pathname.slice(1);
      if (code && !code.includes('/')) {
        const link = links.get(code);
        if (link) {
          link.hits += 1;
          return withCors(Response.redirect(link.url, 302));
        }
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
});