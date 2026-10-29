# Snip backend

A zero-dependency Bun URL shortener API. Links are held in memory and are cleared when the server restarts.

## Run

```bash
bun start
```

The server listens on port `3000` by default. Set `PORT` to change it, `BASE_URL` to control generated short-link origins, or `RAILWAY_PUBLIC_DOMAIN` to use Railway's HTTPS domain when `BASE_URL` is unset. Set `PUBLIC_DIR` to serve static files from a directory; `/` serves its `index.html`.

## API

- `POST /api/links` with `{ "url": "https://example.com" }` creates a short link.
- `GET /api/links` returns all links and hit counts.
- `GET /:code` redirects to the original URL and increments its hit count.

Only HTTP and HTTPS URLs are accepted. Responses include permissive CORS headers.