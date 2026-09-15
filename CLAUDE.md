# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NHP Printer and Parts Management** is a Next.js web application for managing printer inventory, spare parts, and maintenance history. Built with TypeScript, Tailwind CSS, and Supabase (PostgreSQL).

### Key Features
- User authentication with Supabase
- Printer and spare parts inventory management
- Change/maintenance history tracking
- Task management with due dates
- Rate-limited API with middleware protection
- Multi-tenant with Row Level Security (RLS) policies

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Database:** Supabase (PostgreSQL) with RLS
- **Auth:** Supabase Auth (email/password)
- **UI Library:** Radix UI (headless components)
- **Styling:** Tailwind CSS 4
- **Forms:** React Hook Form + Zod validation
- **Date Handling:** date-fns
- **Package Manager:** pnpm
- **Runtime:** Node.js

## Development Commands

```bash
# Development server (http://localhost:3000)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Lint code (eslint with Next.js config)
pnpm lint
```

## Project Structure

```
├── app/
│   ├── auth/                    # Authentication pages
│   ├── dashboard/               # Main dashboard
│   │   ├── printers/           # Printer management
│   │   ├── spare-parts/        # Parts inventory
│   │   ├── tasks/              # Task management
│   │   ├── add-change/         # Record maintenance changes
│   │   └── settings/           # User settings
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                # Auth redirect router
│   └── globals.css             # Global Tailwind styles
├── components/
│   ├── ui/                     # Radix UI component wrappers
│   ├── dashboard/              # Dashboard-specific components
│   ├── printers/               # Printer management components
│   └── spare-parts/            # Spare parts components
├── lib/
│   ├── supabase/              # Supabase client setup
│   │   ├── client.ts          # Browser client (createBrowserClient)
│   │   ├── server.ts          # Server client (createServerClient)
│   │   └── proxy.ts           # Session proxy for middleware
│   ├── argentina-time.ts      # Buenos Aires timezone utilities
│   ├── format-date.ts         # Date formatting helpers
│   └── utils.ts               # General utilities (cn for class merge)
├── scripts/
│   ├── 001_create_tables.sql  # Initial schema with RLS
│   ├── 002_add_printer_id.sql # Migrations...
│   └── ...                    # (005_create_tasks.sql is latest)
├── middleware.ts              # Rate limiting & session refresh
├── next.config.mjs            # Disable type errors, unoptimized images
├── tsconfig.json              # Path alias: @/* → ./
└── package.json               # Dependencies & scripts
```

## Database Schema

Core entities in Supabase PostgreSQL:

- **printers:** User's printer fleet
  - Fields: id, user_id, name, counter, color, created_at, updated_at
  - RLS: Users see only their own printers
  
- **spare_parts:** Inventory of replacement parts
  - Fields: id, user_id, code, description, high_rotation, created_at, updated_at
  - RLS: Users see only their own parts
  
- **spare_part_changes:** Maintenance history (audit trail)
  - Fields: id, user_id, printer_id, spare_part_id, change_date, printer_counter, quantity, detail
  - Relations: → printers, spare_parts
  - RLS: Users see only their own changes
  
- **tasks:** Maintenance reminders
  - Fields: id, user_id, title, due_date, due_time, printer_id, priority, completed_at, completed_by, created_at, updated_at
  - `priority`: 'baja' | 'media' | 'alta' (default 'media')
  - `completed_by`: 'M' | 'A' | 'V' (who completed the task)
  - `printer_id`: optional FK → printers (ON DELETE SET NULL)
  - Filtering: Dashboard shows today's incomplete tasks (`due_date = today AND completed_at IS NULL`)

- **manuals / manual_entries:** Shared service-manual reference data (Ricoh SC/SP codes)
  - `manuals`: id, machine_name, created_at
  - `manual_entries`: id, manual_id FK, type ('error' | 'codigo'), code, level, title, detection, causes, solution, description, setting, created_at, updated_at
  - `type='error'` = SC codes → columns ERROR(code) / NIVEL(level A-D severity) / SÍNTOMA(detection) / POSIBLE CAUSA(causes) / SOLUCIÓN(solution)
  - `type='codigo'` = SP codes → columns CÓDIGO(code) / NOMBRE(title) / DESCRIPCIÓN(description) / AJUSTE(setting). SP sub-parameters are one row each (e.g. SP1-002-001).
  - **GLOBAL data (NOT user-scoped):** these two tables have no `user_id`. RLS is enabled but policies grant the `authenticated` role full access (`USING (true)`), so every logged-in user shares and edits the same manual. This is the ONLY exception to the per-user pattern below.
  - Schema history: `007_create_manuals.sql` (initial), `009_manuals_entries_v2.sql` (recreates manual_entries with the columns above). Seed: `010_seed_manual_ricoh7502.sql`, generated by `scripts/extract_manual.py` (best-effort PDF text extraction from the SC-code and System/Printer/Scanner SP appendix tables; SP7000/SP8000 data logs are excluded; all fields editable in-app)

Except the shared `manuals`/`manual_entries` pair, all tables include Row Level Security policies enforcing `auth.uid() = user_id`.
Migration files in `scripts/` are numbered sequentially and applied manually.

## Key Patterns & Architecture

### Authentication Flow
1. Public routes: `/auth/login`, `/auth/error`
2. Root `/` checks auth status → redirects to `/dashboard` or `/auth/login`
3. **Middleware** (`middleware.ts`) calls `updateSession()` to refresh auth state
4. Rate limiting: 500 requests per 15 minutes per IP (excludes static assets)

### Data Fetching
- **Server Components** (default): Use `supabase.from().select()` directly in `page.tsx`
- **Client Components**: Import `createClient()` from `lib/supabase/client.ts`
- All queries filtered by `user_id` at the database level (RLS)
- Dashboard aggregates counts with `.select("*", { count: "exact" })`

### Time & Localization
- Argentina timezone (Buenos Aires) applied via `getArgentinaTodayYmd()`
- Date display uses `formatDate()` utility
- SQL migrations use `TIMESTAMPTZ` for all timestamps

### UI Components
- Shadcn-style Radix UI wrappers in `components/ui/`
- Import patterns: `import { Button } from "@/components/ui/button"`
- Responsive: Grid layouts use `md:grid-cols-2 lg:grid-cols-4`
- Icons from Lucide React (e.g., `Printer`, `Package`, `History`)
- Toast notifications via `sonner` (see `components/ui/sonner.tsx`)

### Forms & Validation
- React Hook Form for form state
- Zod for schema validation
- Form components in `components/ui/form.tsx`
- Example: `components/printers/edit-printer-name-form.tsx`

## Environment Setup

**Required:**
- `.env.local` with Supabase credentials:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]
  ```
  (Already configured; update if switching projects)

## Middleware & Security

**Rate Limiting** (`middleware.ts`):
- 500 requests per 15 minutes per IP
- Skips `/_next` and `/favicon` assets
- Returns 429 on limit exceeded

**Session Management:**
- Middleware calls `updateSession()` to refresh Supabase auth tokens
- Server components always verify `supabase.auth.getUser()` before accessing data
- Unauthorized access redirects to `/auth/login`

## Common Tasks

### Add a New Feature Page
1. Create route in `app/dashboard/[feature]/page.tsx`
2. Verify user auth at top of component
3. Query Supabase with `const supabase = await createClient()`
4. Use `components/ui/` primitives for layout

### Add a Database Table
1. Create migration file in `scripts/` (e.g., `006_add_new_table.sql`)
2. Include RLS policies enforcing `auth.uid() = user_id`
3. Add indexes on `user_id` and foreign keys
4. Apply via Supabase dashboard SQL editor

### Debug a Client Component
- Use `lib/supabase/client.ts` for browser Supabase instance
- Browser console shows fetch errors from RLS violations
- Check Supabase dashboard for policy mismatches

### Styling
- Tailwind classes directly in JSX (no CSS files needed unless global)
- Responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Color utilities: text-foreground, bg-muted, etc. (from theme)
- `cn()` utility in `lib/utils.ts` for conditional classes

## Notes

- TypeScript strict mode enabled; types are required
- Next.js ignores build-time TypeScript errors (see `next.config.mjs`)
- Images unoptimized (see config)
- No auth provider wrapper needed (Supabase SSR handles it)
- Inline SQL migrations (not Prisma/ORM) for direct PostgreSQL control
