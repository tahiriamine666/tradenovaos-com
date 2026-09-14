# TradeNovaOS

TradeNovaOS is a React/Vite trading journal and analytics SaaS backed by Supabase and Dodo Payments.

## Local development

1. Install Node.js 20+ and run `npm install`.
2. Create `.env.local` with:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

3. Run `npm run dev`.

## Quality checks

Run these before deploying:

```
npm run lint
npm test
npm run build
```

## Payments and backend configuration

Configure these Supabase Edge Function secrets; never commit their values:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=https://tradenovaos.com
DODO_ENV=live
DODO_API_KEY=
DODO_WEBHOOK_SECRET=
DODO_PRODUCT_PRO_MONTHLY=
DODO_PRODUCT_PRO_YEARLY=
DODO_PRODUCT_ELITE_MONTHLY=
DODO_PRODUCT_ELITE_YEARLY=
FMP_API_KEY=
```

Deploy database migrations before deploying Edge Functions. Configure the Dodo webhook to call `dodo-webhook` and validate it with `DODO_WEBHOOK_SECRET`.

## Release checklist

- Verify checkout uses the selected monthly or yearly product.
- Verify webhook signature validation, duplicate delivery, cancellation, and renewal flows.
- Confirm Row Level Security policies protect every user-owned table.
- Deploy to staging, complete a test payment, then promote to production.
- Keep a rollback release available for billing changes.
