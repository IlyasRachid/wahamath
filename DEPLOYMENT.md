# Deploying WahaMath

This project has three deployed services:

- **Frontend**: Next.js application on Vercel.
- **API**: FastAPI application on Render, built with `backend/Dockerfile`.
- **Auth, database and storage**: existing Supabase project.

## Before publishing

The currently configured GitHub repository contains only the `frontend/` directory. Before deploying, consolidate the project into a single Git repository that contains `frontend/`, `backend/`, and `database/`. Never commit `.env.local`, SMTP keys, Supabase service-role keys, or other secrets.

## Render API

Create a new Render **Web Service** from the consolidated repository:

- Environment: Docker
- Root directory: `backend`
- Dockerfile path: `./Dockerfile`
- Health check path: `/health`

Add these server-only environment variables in Render:

```text
SUPABASE_URL=<Supabase Project URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role key>
FRONTEND_ORIGINS=<Vercel frontend URL>
```

Copy the resulting HTTPS URL, for example `https://wahamath-api.onrender.com`.

## Vercel frontend

Import the same repository into Vercel and set **Root Directory** to `frontend`.

Add these production environment variables in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL=<Supabase Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
NEXT_PUBLIC_API_URL=<Render API HTTPS URL>
```

Redeploy after adding `NEXT_PUBLIC_API_URL`, since values prefixed with `NEXT_PUBLIC_` are embedded at build time.

## Supabase URLs and CORS

After Vercel provides its URL:

1. In **Supabase → Authentication → URL Configuration**, add:
   - the Vercel Site URL;
   - `<Vercel URL>/reinitialiser-mot-de-passe` as an additional redirect URL.
2. In Render, update `FRONTEND_ORIGINS` to exactly the Vercel URL (no trailing slash) and redeploy the API.

## Verification checklist

1. Visit `<Render URL>/health`; it must return `{"status":"ok","service":"wahamath-api"}`.
2. Open the Vercel URL and register a test student.
3. Verify the Brevo confirmation email, teacher approval, login, exercise access, comments, moderation, and password recovery.

When a custom domain is purchased, repeat the Supabase redirect URL and `FRONTEND_ORIGINS` updates for it, then replace `NEXT_PUBLIC_API_URL` only if the API domain changes.
