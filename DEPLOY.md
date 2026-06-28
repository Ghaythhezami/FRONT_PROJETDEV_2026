# Deploy backend to Render (`adjusted-backend` branch)

Repo: [Ghaythhezami/projetDev2026](https://github.com/Ghaythhezami/projetDev2026/tree/adjusted-backend)

## Option A — Blueprint (recommended)

1. Push this repo (including `render.yaml`) to GitHub on branch **`adjusted-backend`**.
2. In [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
3. Connect `Ghaythhezami/projetDev2026` and select branch **`adjusted-backend`**.
4. Render creates:
   - PostgreSQL database `agile-ai-db`
   - Web service `agile-ai-api` (Docker)
5. After the first deploy, open the web service → **Environment** and set:

| Variable | Example |
|----------|---------|
| `Cloudinary__CloudName` | your cloud name |
| `Cloudinary__ApiKey` | your API key |
| `Cloudinary__ApiSecret` | your API secret |
| `Cloudinary__Folder` | `agile-ai` |
| `Cors__AllowedOrigins__0` | `https://your-frontend.vercel.app` |

`Jwt__Secret` and `ConnectionStrings__Connection` are auto-set by the blueprint.

6. Copy your service URL (e.g. `https://agile-ai-api.onrender.com`). You need it for Vercel.

## Option B — Manual web service

1. **New → Web Service** → connect repo, branch **`adjusted-backend`**.
2. **Environment**: Docker  
   **Dockerfile path**: `Dockerfile` (repo root)  
   **Docker context**: `.` (repo root)

   Alternative path also works: `Poulina.TraceServer.Api/Dockerfile` with context `.`
3. Create a **PostgreSQL** database on Render and set:

```
ConnectionStrings__Connection=Host=...;Port=5432;Database=...;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true
Jwt__Secret=<long random string>
ASPNETCORE_ENVIRONMENT=Production
```

4. Add Cloudinary and CORS variables as in the table above.

## Notes

- The API listens on Render’s `PORT` (handled by `docker-entrypoint.sh`).
- EF migrations run automatically on startup (`Database.Migrate()`).
- Demo seed data runs on startup (`DevDataSeeder`).
- Swagger: `https://<your-service>.onrender.com/swagger/index.html`
- SignalR hub: `wss://<your-service>.onrender.com/hubs/board` (WebSockets supported on Render web services).
- Free tier spins down after inactivity; first request may take ~30s.

## Verify

```bash
curl https://<your-service>.onrender.com/swagger/index.html
```

Login (seeded admin): `admin@agileai.com` / `AgileAdmin@2026!`
