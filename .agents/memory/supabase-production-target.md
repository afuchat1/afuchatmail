---
name: Supabase production target
description: Which Supabase project the AfuChat Mail frontend and edge functions are intended to use.
---

The app must use the migrated production Supabase project configured in the shared browser client, not the older project values still present in the local Vite environment file.

**Why:** The migration runbook identifies the older project as the paused source and the migrated project as the production target. Using the stale environment values makes the app appear connected while sending auth and data requests to the wrong backend.

**How to apply:** Keep all web data access through the shared Supabase client/configuration and treat the migration runbook plus `supabase/config.toml` as the authority when checking project identity.