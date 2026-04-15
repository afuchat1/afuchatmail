# Replit Project Notes

## Overview
AfuChat Mail is a Vite, React, TypeScript, shadcn/ui, and Tailwind CSS application imported from Lovable.

## Current Setup
- Backend remains on the original Supabase integration and should not be migrated to Replit PostgreSQL or Drizzle.
- Development command remains `npm run dev`.
- The current work is focused on UI/UX only: professional flat styling, shared marketing navigation, desktop/mobile layout improvements, and better loading states.

## Migration Notes
- Preserve the Lovable/Supabase application structure unless the user explicitly asks for backend changes.
- Do not add Replit database code or switch persistence away from Supabase.
