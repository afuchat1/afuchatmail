# Migration Runbook: Lovable Cloud → New Supabase Project

Target project: `https://lqowocmjmhbkoxlwyxku.supabase.co`
Source project: Lovable Cloud `vfcukxlzqfeehhkiogpf` (currently paused)

## Important limitations

1. Lovable Cloud cannot be fully disconnected from a project once added. The new Supabase project will become the active backend, but the Cloud connector remains in project history.
2. The source backend is paused. You must resume it (add credits) to export data, auth users, storage, and edge functions. If you do not resume, you can only migrate the schema and start fresh.

## Pre-migration checklist

- [ ] New Supabase project created and accessible at `https://lqowocmjmhbkoxlwyxku.supabase.co`
- [ ] Source Lovable Cloud backend resumed (if data migration is required)
- [ ] All third-party API keys available: Resend, Engagera, SkyPay, Telegram bot, VAPID keys, etc.

## Step 1: Connect the new Supabase project in Lovable

1. Open **Project Settings → Integrals → Supabase**.
2. Click **Connect Supabase** → **New connection**.
3. Authenticate with Supabase and select project `lqowocmjmhbkoxlwyxku`.
4. Lovable will rewrite `.env` with the new `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, and `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. If the connection does not auto-update `.env`, manually set:
   ```
   VITE_SUPABASE_URL=https://lqowocmjmhbkoxlwyxku.supabase.co
   VITE_SUPABASE_PROJECT_ID=lqowocmjmhbkoxlwyxku
   VITE_SUPABASE_PUBLISHABLE_KEY=<new anon key>
   ```

## Step 2: Apply schema to the new project

1. Open the Supabase SQL Editor for the new project.
2. Run the contents of `scripts/new-supabase-schema.sql` (concatenated from all existing migrations).
3. Verify tables, RLS policies, functions, and triggers were created.

## Step 3: Migrate auth users

Auth users live in the `auth` schema and cannot be copied with normal SQL dumps.

### Option A: Export/import via Supabase CLI (recommended)

```bash
# From the source project
supabase db dump --db-url "postgresql://postgres.vfcukxlzqfeehhkiogpf:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" --schema auth --file auth_schema.sql
supabase db dump --db-url "postgresql://postgres.vfcukxlzqfeehhkiogpf:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" --schema auth --data-only --file auth_data.sql

# Apply to the new project
psql "postgresql://postgres.lqowocmjmhbkoxlwyxku:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -f auth_schema.sql
psql "postgresql://postgres.lqowocmjmhbkoxlwyxku:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -f auth_data.sql
```

### Option B: Ask users to reset passwords

If CLI access is not possible, leave auth empty and ask users to sign up again or use password recovery on the new project.

## Step 4: Migrate public schema data

Use `pg_dump` for public tables (profiles, email_addresses, custom_domains, oauth apps, etc.):

```bash
pg_dump --data-only --no-owner --no-acl \
  "postgresql://postgres.vfcukxlzqfeehhkiogpf:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" \
  --table='public.*' > public_data.sql

psql "postgresql://postgres.lqowocmjmhbkoxlwyxku:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -f public_data.sql
```

Skip `auth` and `storage` system tables. Migrate storage objects separately (Step 6).

## Step 5: Migrate secrets

The following secrets must be re-created in the new Supabase project (Supabase Dashboard → Project Settings → Secrets):

- `ENGAGERA_API_KEY`
- `LOVABLE_API_KEY` (if still needed)
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `SKYPAY_API_KEY`
- `SKYPAY_SELLER_ID`
- `SUPABASE_SERVICE_ROLE_KEY` (auto-generated, but needed in edge functions)
- `TELEGRAM_BOT_TOKEN`
- `VAPID_PRIVATE_KEY`
- `VAPID_PUBLIC_KEY`

Also update any webhooks (Resend, SkyPay, Telegram) to point to the new Supabase Functions URL:
`https://lqowocmjmhbkoxlwyxku.supabase.co/functions/v1/<function-name>`

## Step 6: Migrate storage buckets and files

1. Recreate buckets in the new project (avatars, attachments, etc.) with the same RLS policies.
2. Use the Supabase CLI or Storage API to copy files:

```bash
supabase storage cp --recursive \
  "https://vfcukxlzqfeehhkiogpf.supabase.co/storage/v1" \
  "https://lqowocmjmhbkoxlwyxku.supabase.co/storage/v1"
```

Or use a Node.js script with `@supabase/supabase-js` to list and re-upload objects.

## Step 7: Deploy edge functions

Deploy all functions to the new project:

```bash
supabase functions deploy --project-ref lqowocmjmhbkoxlwyxku
```

Functions to deploy:

- `afumail-api`
- `ai-email-assist`
- `custom-domain-dns`
- `delete-account`
- `receive-email`
- `request-password-reset`
- `reset-password`
- `send-email`
- `send-push-notification`
- `skypay-checkout-session`
- `skypay-confirm-payment`
- `skypay-webhook`
- `status-probe`
- `telegram-bot`
- `telegram-miniapp-api`
- `telegram-miniapp-auth`
- `verify-custom-domain`

## Step 8: Update external service webhooks and DNS

- **Resend**: Update webhook URL to `https://lqowocmjmhbkoxlwyxku.supabase.co/functions/v1/receive-email`.
- **Telegram bot**: Update webhook URL to `https://lqowocmjmhbkoxlwyxku.supabase.co/functions/v1/telegram-bot`.
- **SkyPay**: Update success/cancel/webhook URLs to the new functions.
- **Custom domains**: If any custom domains are verified, their DNS records (MX, SPF, DKIM) must point to the new project. Re-verify in the app settings.

## Step 9: Verify the migration

1. Build and preview the app: `npm run build && npm run preview`
2. Test sign-up/sign-in.
3. Test sending and receiving email.
4. Test custom domain DNS verification.
5. Test OAuth consent flow.
6. Test push notifications.
7. Test payments (if enabled).

## Rollback plan

If something fails, keep the source Lovable Cloud project paused but do not delete it. You can:

- Revert `.env` to the old values.
- Resume the old project.
- Point the DNS/webhooks back to the old functions URL.

## Post-migration cleanup

After 7–14 days of stable operation on the new project, you can disable or pause the old Lovable Cloud backend from the Cloud tab. Do not delete it until you are certain no data or auth users are needed.
