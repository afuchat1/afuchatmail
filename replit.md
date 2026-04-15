# Replit Project Notes

## Overview
AfuChat Mail is a Vite, React, TypeScript, shadcn/ui, and Tailwind CSS application imported from Lovable.

## Current Setup
- Development workflow: `npm run dev`
- Web preview port: 5000
- Vite is configured for Replit preview compatibility with open host access and `.local` ignored from file watching.
- Production deployment is configured as a static Vite build served from `dist`.

## Migration Notes
- Dependencies were installed with npm and a package lock is present.
- The application launches successfully in the Replit preview without workflow or browser runtime errors.
- Original Lovable/Supabase source files are preserved to avoid rewriting the project from scratch.
