# Snip: one backend, two clients

Snip is a tiny URL shortener demonstrating a branch-per-layer Git layout. One Bun API serves the same contract to an Angular web app and a Node.js CLI. The backend stores links in memory, so restarting it clears them.

## API

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `POST` | `/api/links` | `{ "url": "https://example.com" }` | `201` `{ code, url, shortUrl, hits, createdAt }`; `400` for invalid input |
| `GET` | `/api/links` | - | `200` array of link objects |
| `GET` | `/:code` | - | `302` redirect and incremented hit count; `404` if unknown |

Only HTTP and HTTPS destination URLs are accepted. The API enables CORS for the web client.

## Layout

Each project lives at the root of its own orphan branch. The `main` branch mounts each branch as a Git submodule, pinning an exact commit in the superproject.

| Path | Branch | Stack | Purpose |
| --- | --- | --- | --- |
| `backend/` | `backend` | Bun | API, in-memory link storage, and short-code redirects |
| `frontend/` | `frontend` | Angular 19 | URL form and links table |
| `cli/` | `cli` | Node.js, CommonJS | Add, list, and open short links |

## Clone

A plain clone leaves submodule directories unpopulated. Clone with submodules:

```bash
git clone --recurse-submodules https://github.com/chngyongquan/snip-workshop_day1.git
cd snip-workshop_day1
```

To populate submodules after a plain clone:

```bash
git submodule update --init --recursive
```

## Run locally

Use three terminals from the `main` checkout. Install Bun 1.x, Node.js 20 or newer, and npm first.

```bash
# Terminal 1: API at http://localhost:3000
cd backend
bun start
```

```bash
# Terminal 2: web app at http://localhost:4200
cd frontend
npm install
npx ng serve
```

```bash
# Terminal 3: CLI (uses the same API)
cd cli
node cli.js add https://example.com
node cli.js ls
node cli.js open <code>
```

The CLI uses `http://localhost:3000` by default. Set `SNIP_API` to point it at another backend.

## Update a project

Commit and push changes from inside the relevant submodule first. Then update and commit the pointer in `main`:

```bash
cd backend
# Edit files, then:
git add -A
git commit -m "Describe backend change"
git push
cd ..
git submodule update --remote backend
git add backend
git commit -m "Bump backend submodule"
git push
```

Use the same workflow with `frontend` or `cli`. The project commit and the superproject pointer commit are separate, keeping each `main` snapshot pinned and reproducible.
