# Deploy frontend to Vercel (with realtime notifications)

The Angular app talks to the Render API via REST and **SignalR** (`/hubs/board`) for live notifications and board updates.

## Prerequisites

1. Backend deployed on Render from branch **`adjusted-backend`** (see `projetDev2026/DEPLOY.md`).
2. Note the Render URL, e.g. `https://agile-ai-api.onrender.com` (no trailing slash).

## Deploy on Vercel

1. Push this folder (`FRONT_PROJETDEV_2026`) to GitHub (same org/user or a dedicated frontend repo).
2. [Vercel Dashboard](https://vercel.com/new) → **Import Project** → select the frontend repo.
3. **Root Directory**: if the repo is the monorepo, set root to `FRONT_PROJETDEV_2026`.
4. **Framework Preset**: Other (or Angular — `vercel.json` overrides build settings).
5. **Environment Variables** (Production + Preview):

| Name | Value |
|------|--------|
| `API_BASE_URL` | `https://your-api.onrender.com` |
| `NODE_ENV` | `production` |

6. Deploy.

`prebuild` runs `scripts/generate-env.mjs`, which reads `API_BASE_URL` from Vercel env and writes `src/environments/environment.ts`.

## Wire CORS on Render (required for login + SignalR)

In the Render web service environment, set:

```
Cors__AllowedOrigins__0=https://your-app.vercel.app
```

Use your exact Vercel URL (and add preview URLs if needed):

```
Cors__AllowedOrigins__1=https://your-app-git-main-username.vercel.app
```

Redeploy the Render service after changing CORS.

## Realtime notifications checklist

| Piece | How it works |
|-------|----------------|
| SignalR hub | `BoardSignalrService` connects to `{API_BASE_URL}/hubs/board` with JWT |
| Auth | Token from `accessTokenFactory` (same JWT as REST API) |
| Events | `NotificationReceived`, `IssueChanged`, `CommentAdded`, etc. |
| Reconnect | Automatic reconnect + WebSocket / SSE / long-polling fallback |
| CORS | Render must allow your Vercel origin with credentials |

After deploy:

1. Log in on Vercel.
2. Open DevTools → Network → filter **WS** — you should see a WebSocket to `wss://your-api.onrender.com/hubs/board`.
3. Trigger a notification (assign a task, add a comment) — bell icon should update without refresh.

## Local development

```bash
cp env/.env.example env/.env
# Edit API_BASE_URL=http://localhost:5067
npm start
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| CORS error on login | Set `Cors__AllowedOrigins__0` on Render to your Vercel URL |
| SignalR 401 | Ensure user is logged in; token must be valid |
| SignalR fails, REST works | Check Render service is awake; WebSocket allowed on Render web services |
| Wrong API | Rebuild Vercel after changing `API_BASE_URL` |
| `index.html` 404 on refresh | `vercel.json` rewrites handle SPA routing |
