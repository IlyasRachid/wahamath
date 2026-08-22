# Deploying WahaMath on Vercel

WahaMath deploys from one private Git repository to one Vercel project:

- `frontend/` is the Next.js service.
- `backend/` is the FastAPI service.
- `vercel.json` routes `/api/*` to FastAPI and all other paths to Next.js.
- Supabase continues to provide Auth, Postgres, and Storage.

The frontend calls `/api/*` on the same deployment URL in production. There is
no separate API host, CORS configuration, or `NEXT_PUBLIC_API_URL` needed on
Vercel.

## Vercel project setup

1. Import the GitHub repository in Vercel.
2. Set the project framework to **Services**. This is required together with
   the root `vercel.json` file for Vercel to build the two services.
3. Keep the project root directory as `./`; do not set it to `frontend`.
4. Add these environment variables for Production, Preview, and Development:

```text
NEXT_PUBLIC_SUPABASE_URL=<Supabase Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_URL=<Supabase Project URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role key>
FRONTEND_ORIGINS=<Vercel deployment URL once created>
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never have a
`NEXT_PUBLIC_` prefix, be committed, or be copied into the browser.

For the first deployment, `FRONTEND_ORIGINS` can be `http://localhost:3000`.
Once Vercel provides its URL, replace it with that exact URL (without a
trailing slash) and redeploy. Same-origin browser API calls do not require
CORS, but the setting remains useful for local development.

## Supabase URL configuration

After Vercel creates the production URL, in **Supabase → Authentication → URL
Configuration** add:

- the Vercel Site URL;
- `<Vercel URL>/reinitialiser-mot-de-passe` as an additional redirect URL.

## Verification checklist

1. Visit `<Vercel URL>/health`; it must return
   `{"status":"ok","service":"wahamath-api"}`.
2. Open the Vercel URL and register a test student.
3. Verify Brevo confirmation email, teacher approval, login, exercises,
   comments, moderation, and password recovery.

When a custom domain is purchased, add it to Vercel and Supabase URL
configuration, then update `FRONTEND_ORIGINS` in Vercel.
