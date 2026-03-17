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
supabase secrets set MP_ACCESS_TOKEN=your-mercado-pago-access-token
```

Optional secrets for payment return flow:

```bash
supabase secrets set APP_RETURN_URL=https://your-app-return-url
```

Wallet integration secrets:

```bash
supabase secrets set APPLE_WALLET_PASS_URL=https://your-domain.com/passes/gym-access.pkpass
supabase secrets set GOOGLE_WALLET_ISSUER_ID=your-google-wallet-issuer-id
supabase secrets set GOOGLE_WALLET_CLIENT_EMAIL=your-service-account-email
supabase secrets set GOOGLE_WALLET_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
supabase secrets set GOOGLE_WALLET_LOGO_URL=https://your-domain.com/logo.png
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
