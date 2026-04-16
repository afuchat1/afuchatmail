# Replit Project Notes

## Overview
AfuChat Mail is a Vite, React, TypeScript, shadcn/ui, and Tailwind CSS application. It was originally built on Lovable and has been migrated to Replit.

## Architecture
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend/Auth/DB**: Supabase (hosted, external — intentionally kept as-is)
- **Edge Functions**: Supabase Edge Functions (Deno) — remain deployed on Supabase
- **Dev server**: Vite on port 5000
- **PWA**: vite-plugin-pwa (service worker, manifest, offline caching)

## Key Config
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are in the `.env` file (NOT Replit env vars — user's explicit requirement)
- `lovable-tagger` devDependency removed (Lovable-platform-only tool)
- `vite.config.ts` updated: removed `componentTagger`, Supabase backend stays on the hosted Supabase project

## Design System (pay.afuchat.com style)
- **Font**: Inter (Google Fonts import in index.css)
- **Color scheme**: Dark hero `#0a0a0a`, white content `#ffffff`, muted `#f5f5f5`, blue primary `hsl(217 100% 50%)`
- **Border radius**: `--radius: 0.25rem` (4px), `xl` overridden to 6px, `2xl` to 8px — flat/sharp
- **Shadows**: None throughout — all `shadow-xs/sm/md/lg` removed
- **Nav**: Dark `#0a0a0a` background with white text, flat links, white "Get started" button
- **Hero**: Dark section with large bold white text + blue accent on key phrase, flat buttons
- **Content sections**: Alternating white and light gray backgrounds, thin 1px borders
- **CTA & Footer**: Dark `#0a0a0a` sections, white text

## Running
- `npm run dev` — starts Vite dev server on port 5000
- `npm run build` — production build to `dist/`

## Notes
- Do NOT migrate the backend from Supabase to Replit Postgres — the Supabase edge functions, auth, and database are part of the production system
- The Supabase anon key (publishable) is intentionally public (embedded in the frontend bundle)
- Supabase Edge Functions live in `supabase/functions/` and are deployed separately on Supabase's platform
