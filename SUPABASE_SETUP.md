# Supabase Setup

1. Create a Supabase project.
2. In `Project Settings -> API`, copy:
   - `Project URL`
   - `anon public` key
3. Put those values into [`.env`](/Users/iarabravo/Desktop/Gym/.env) or your own local env file.
4. In the Supabase SQL editor, run [schema.sql](/Users/iarabravo/Desktop/Gym/supabase/schema.sql).
5. Set function secrets:

```bash
supabase secrets set PROJECT_URL=https://your-project-id.supabase.co
supabase secrets set SERVICE_ROLE_KEY=your-service-role-key
```

6. Deploy your edge function from [functions/server/index.tsx](/Users/iarabravo/Desktop/Gym/functions/server/index.tsx).
7. Restart the Vite dev server after changing env vars.

Useful commands:

```bash
npm install
npm run dev
npm run build
npx cap sync android
npx cap sync ios
```
