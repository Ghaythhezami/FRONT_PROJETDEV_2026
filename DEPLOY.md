# Deploy backend to Render + Neon PostgreSQL

Repo: [adjusted-backend](https://github.com/Ghaythhezami/projetDev2026/tree/adjusted-backend)

## 1. Neon database

1. Create a project in [Neon](https://neon.tech).
2. Copy the connection string (URI or details tab).
3. Convert to Npgsql format if needed:

```
Host=ep-xxx.us-east-1.aws.neon.tech;Port=5432;Database=neondb;Username=neondb_owner;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
```

4. Push tables locally (once):

```bash
cd Poulina.TraceServer.Api
dotnet ef database update --project ../TraceServer.Data --connection "Host=...;Port=5432;Database=neondb;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true"
```

On Render deploy, `Database.Migrate()` also runs on startup.

## 2. Render web service

Branch: **`adjusted-backend`** · Dockerfile: **`Dockerfile`** (repo root) · Context: **`.`**

### Required environment variables

| Variable | Value |
|----------|--------|
| `ConnectionStrings__Connection` | Neon Npgsql string (see above) |
| `Jwt__Secret` | Long random string |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `Cloudinary__CloudName` | your cloud name |
| `Cloudinary__ApiKey` | your key |
| `Cloudinary__ApiSecret` | your secret |
| `Cors__AllowedOrigins__0` | `https://your-app.vercel.app` |

Optional: set `DATABASE_URL` to the Neon `postgresql://` URI instead of `ConnectionStrings__Connection`.

## 3. Verify

- Swagger: `https://<service>.onrender.com/swagger/index.html`
- SignalR: `wss://<service>.onrender.com/hubs/board`
- Seed admin: `admin@agileai.com` / `AgileAdmin@2026!`
