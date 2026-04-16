# AfuChat Mail — Replit Notes

## Overview
AfuChat Mail is a fully-featured @afuchat.com email service SPA built with React + Vite + TypeScript + Tailwind CSS + shadcn/ui. Supabase is the exclusive backend (auth, database, realtime, edge functions, storage).

## Architecture
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend/Auth/DB**: Supabase (hosted, external — no Replit DB involved)
- **Edge Functions**: Supabase Edge Functions (Deno) — deployed on Supabase platform
- **Dev server**: Vite on port 5000
- **PWA**: vite-plugin-pwa (service worker, manifest, offline caching)

## Key Config
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are in `.env` file ONLY — NOT Replit env vars (user's explicit requirement)
- Supabase anon key is intentionally public (embedded in frontend bundle)
- `lovable-tagger` devDependency removed (Lovable-only tool)
- `vite.config.ts`: removed `componentTagger`

## Design System
- **Font**: Inter (loaded in HTML)
- **Primary color**: `hsl(220 100% 50%)` — bright blue `#0052ff`
- **Border radius**: `--radius: 0.375rem` (6px) — small rounded corners throughout
- **Shadows**: None — flat minimal design
- **Dark hero sections**: `#0a0a0a` background
- **Light content**: White `#fff`, card `#f9f9f9`, border `#e3e3e3`
- **Sidebar width**: `--sidebar-width: 17rem` CSS variable

## Core Pages
- `/` — Landing page (dark hero, features, stats, testimonials, FAQ)
- `/auth` — Split-screen auth (form + feature list)
- `/dashboard` — Mail app (3-panel desktop: sidebar + list + viewer; mobile: tab bar)
- `/settings` — Account settings (standalone and embedded in dashboard)
- `/admin` — Admin panel (admin-only)
- `/developers` — OAuth app management
- `/features`, `/pricing`, `/about`, `/contact` — Marketing pages
- `/privacy`, `/terms`, `/security`, `/docs`, `/help`, `/status`, `/changelog`, `/solutions` — Support pages
- `/telegram` — Telegram MiniApp

## Key Components
- `EmailSidebar` — Sidebar with real-time unread counts per folder, account dropdown, compose button
- `EmailList` — Email list with thread grouping, bulk selection (checkboxes, mark read, delete), swipe gestures, offline cache
- `EmailViewer` — Thread view, AI smart replies, attachments, snooze, restore
- `EmailComposer` — Full composer with AI assist (smart reply, autocomplete, tone, grammar), CC/BCC, attachments, scheduling, templates
- `BottomTabBar` — Mobile bottom navigation (Mail, Search, Settings) with unread badge
- `SiteHeader` — Dark navigation bar with mega-menu dropdowns

## Mail App Features
- **Keyboard shortcuts**: C (compose), R (reply), Esc (close), / (search)
- **3-panel layout**: Desktop shows sidebar + email list + email viewer side-by-side
- **Bulk actions**: Select multiple emails → mark read or delete
- **Unread counts**: Per-folder badges in sidebar, real-time via Supabase Realtime
- **Offline support**: IndexedDB cache via custom offlineCache lib
- **Push notifications**: Web Push via Supabase Edge Function
- **Telegram bot**: Link Telegram account for notifications

## Supabase Schema (key tables)
- `profiles` — User profiles
- `email_addresses` — Custom @afuchat.com addresses (with aliases)
- `folders` — inbox, sent, drafts, spam, trash (per user)
- `emails` — Full email records (threading, snooze, importance, attachments)
- `user_settings` — Per-address settings (signature, reply-to, notifications)
- `push_subscriptions` — Web push endpoints
- `oauth_applications`, `oauth_codes`, `oauth_tokens` — OAuth 2.0 developer API
- `user_roles` — Admin role management
- `admin_audit_log` — Admin actions log
- `telegram_links` — Telegram account links
- `subscriptions` — Active SkyPay-backed paid plan per user
- `payment_transactions` — SkyPay webhook/payment reference ledger used for idempotent subscription activation

## SkyPay Payments
- Checkout is created by the Supabase Edge Function `skypay-checkout-session`; the frontend never stores a SkyPay seller ID or API key.
- Live checkout requires Supabase secrets `SKYPAY_SELLER_ID`, `SKYPAY_API_KEY`, and optionally `SKYPAY_WEBHOOK_SECRET` for webhook signature checks.
- SkyPay webhook endpoint: `/functions/v1/skypay-webhook`; successful `payment.success` events are confirmed by reference before activating a subscription.

## Running
- `npm run dev` — starts Vite dev server on port 5000
- `npm run build` — production build to `dist/`

## Important Rules
- NEVER use Replit Postgres or Replit env vars — everything uses Supabase
- Do NOT modify Supabase edge functions unless explicitly asked
- Keep all Supabase calls using `src/integrations/supabase/client.ts`
- Backend changes should be delivered as SQL for the user to run in Supabase unless explicitly asked otherwise
- Server/Postgres dependencies are intentionally not used; this is a Supabase-only frontend and Supabase Edge Functions app
