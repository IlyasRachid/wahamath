# WahaMath backend

This folder contains the server API. It will hold privileged operations only:

- verifying authenticated teacher roles;
- validating and storing teacher exercise-image uploads in Supabase Storage;
- moderation actions and server-side rate limits.

It does **not** contain an AI chat service.

## Local setup

```bash
cp .env.example .env.local
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env.local`. The service-role key is server-only; never copy it to `frontend/.env.local`.

The health endpoint is available at `http://localhost:8000/health` and interactive API documentation at `http://localhost:8000/docs`.

`POST /api/exercises` requires a valid Supabase access token for an active teacher account. It validates the image, writes it to the private `exercise-images` bucket, and creates the database record in one request.
