---
name: Vite compiler compatibility
description: Replit runtime compatibility guidance for imported Vite React projects
---

Imported Vite React projects may fail before opening the dev port with a native bus error when using `@vitejs/plugin-react-swc`. The standard `@vitejs/plugin-react` plugin is a compatible fallback for the same Vite 5 stack.

**Why:** The failure can occur before Vite emits a useful application error, while the Babel-based React plugin starts and builds normally in the same environment.

**How to apply:** If both `vite build` and `vite dev` exit immediately with a bus error and the config uses the SWC React plugin, switch to the standard React plugin before investigating application code.