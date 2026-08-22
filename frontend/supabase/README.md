# Frontend Supabase configuration

The frontend only needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

Database migrations and Supabase setup instructions now live in the top-level [`database/`](../../database/) directory. Server-only configuration belongs in [`backend/`](../../backend/); never add a service-role key to the frontend environment.

For password recovery, add these URLs under **Supabase → Authentication → URL Configuration → Redirect URLs**:

- `http://localhost:3000/reinitialiser-mot-de-passe`
- `https://your-production-domain/reinitialiser-mot-de-passe`

Replace the production example with the deployed WahaMath domain. Supabase rejects recovery redirects that are not allowlisted.
