# WahaMath database

All database migrations live in `database/migrations/`.

## Initial setup

1. In the Supabase SQL Editor, run each migration in [migrations/](migrations/) in filename order.
2. In Supabase Storage, create a **private** bucket named `exercise-images`.
3. Create the teacher account through the app's sign-up flow, then promote it in the SQL Editor:

```sql
update public.profiles
set role = 'teacher', status = 'active'
where id = (select id from auth.users where email = 'teacher@example.com');
```

The schema seeds 2SM, 1SM, 2PC&SVT, and TCS with the chapters currently shown by the frontend. Student accounts begin as `pending`; the teacher will later activate them and add their class membership from the admin UI.
