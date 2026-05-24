# CLAUDE.md

## CRITICAL: Never commit or push without explicitly asking the user first.

---

## Project
Aragon AI — Image upload, validation pipeline (Round 1)

---

## Tech Stack
- Frontend: Vite + React + TypeScript + TanStack Query + Tailwind CSS + shadcn/ui
- Backend: Node + Express + TypeScript + Prisma (v6)
- DB: PostgreSQL (Supabase) + Connection Pooling (PgBouncer)
- Storage: Supabase Storage (presigned upload URL flow)
- Image processing: sharp (resize, normalize) + heic-convert (HEIC→JPEG)
- Face detection: @vladmandic/face-api + @tensorflow/tfjs-node
- Deploy: Vercel (frontend) + Render (backend)

---

## Build & Development Commands

**Root:**
- `npm run dev`: Start client + server
- `npm run db:studio`: Open Prisma Studio

**Server:**
- `npx prisma@6 db push`: Sync schema to Supabase (uses DIRECT_URL)
- `npm run build`: Compile TypeScript
- `npm start`: Run compiled server

**Client:**
- `npm run dev`: Start Vite dev server
- `npm run build`: Build for production

---

## Architecture Rules

1. Route handler → DB call directly. No service layer, no repository pattern.
2. Validate at route boundary with Zod. Nowhere else.
3. Return data directly. No response envelopes like { success, data, error }.
4. Upload flow: server generates presigned URL → client uploads directly to Supabase → client sends path back to server to save.
5. TanStack Query for all server state. No Redux. No Zustand unless cross-screen client-only state exists.
6. Two layers max. No abstraction until the same code appears 3+ times.
7. No console.log in final code.
8. Atomic commits — one commit per task. Format: `type(scope): description`.

---

## Folder Structure

    client/src/
      pages/           ← screen-level components
      components/ui/   ← shadcn components (copy-pasted)
      lib/
        api.ts         ← all fetch wrappers
        utils.ts       ← shadcn cn() utility
      hooks/           ← custom hooks only if used 2+ places
      main.tsx
      App.tsx

    server/src/
      routes/          ← one file per resource
      lib/
        supabase.ts    ← supabase client singleton
        faceModel.ts   ← face-api init
      index.ts         ← Express app
      db.ts            ← Prisma client singleton
      schemas.ts       ← Zod schemas
      validators/      ← format, dimensions, blur, duplicate, face

    server/prisma/
      schema.prisma    ← data model

---

## AI Usage During This Session

Write code within decisions already made in the codebase.
Do not suggest patterns outside the architecture rules above.
Prefer simple over clever.
