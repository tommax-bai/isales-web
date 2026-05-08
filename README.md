# isales-web

Vue 3 admin frontend for the iSales platform — stage 7 of the rollout. Drives
all admin operations (campaigns / leads / voice / devices / monitoring / call
records / callbacks) against the **isales-api** HTTP + WebSocket endpoints.
No DB access; the backend is the source of truth.

Stack: Vue 3 (Composition API) + Vite + TypeScript + Element Plus + Pinia +
Vue Router + axios + echarts + CodeMirror 6 + vitest.

## Develop

```
cp .env.example .env.local
npm install
npm run dev          # http://localhost:5173 (proxies /api + /ws to localhost:8000)
npm test
npm run typecheck
```

## Build

```
npm run build        # produces dist/
```

## Deploy (production)

`dist/` is a static SPA. The provided `deploy/nginx.conf` wires:

* `/` → SPA `try_files $uri $uri/ /index.html`
* `/api` → reverse-proxy to isales-api (default port 8000)
* `/ws` → WebSocket upgrade reverse-proxy to isales-api

PR #11 (deploy) extends this with systemd + production hardening.

## Status

PR #1 ships the bare skeleton + `/dashboard` placeholder + login shell.
Subsequent PRs land per `openspec/changes/impl-web/tasks.md`:

| PR | Scope |
|---|---|
| #1 | repo skeleton + Vue + Vite + Element Plus + router + DefaultLayout |
| #2 | JWT auth + login + router guard |
| #3 | Campaigns (list + edit with 9 nested config tabs) |
| #4 | Leads + CSV import |
| #5 | Voice models + devices + SIM cards |
| #6 | Analytics dashboard (echarts) |
| #7 | Realtime call monitor (WebSocket) |
| #8 | Call records list + transcript timeline + recording playback |
| #9 | Callback configs + callback logs (CodeMirror editors) |
| #10 | Handoff tasks + holidays |
| #11 | Deploy: Nginx config + production README |
| #12 | Polish + handoff |
