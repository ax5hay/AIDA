# Parity — standalone ANC capture micro-service

Parity is an **optional module** in the AIDA monorepo: it adds **new** Prisma models and **new** apps. It does **not** modify the existing `@aida/api` or `@aida/web` code paths.

## What it does

- **Capture** monthly ANC indicator counts aligned to `Excel_Sheets/ANC.xlsx` (Haroli row labels).
- **Taxonomy**: districts, blocks (per district), facility types (CH / CHC / PHC / custom), regions — all extendable from the UI.
- **Validation** (`@aida/parity-core`): Zod ensures **only integers or null** for indicators; **remarks** are the only free-text field. Business rules enforce **numerators ≤ total women who attended ANC**, with **tablet exceptions**:
  - `ifaTabletsPerWoman` ≤ **180**
  - `pwProvidedIfaTabletsSecondTrimester` ≤ **180 × (total women attended)** when attendance is known
- **Observability**: rollups by district, block, facility type, region; null-field rate; duplicate key detection; z-scores on ANC attendance within block; quality flags.

## Architecture

| Piece | Package / app | Port (dev) |
|-------|---------------|------------|
| Core logic | `packages/parity-core` | — |
| API | `apps/parity-api` | 4010 |
| Web | `apps/parity-web` | 3001 |
| Database | `packages/db` — models `Parity*` | shared `DATABASE_URL` |

## Database

1. Use the **same** `DATABASE_URL` as AIDA (or a dedicated DB — Prisma is the source of truth).

2. Apply schema (adds only `Parity*` tables):

   ```bash
   npx prisma db push --schema packages/db/prisma/schema.prisma
   # or
   npx prisma migrate dev --schema packages/db/prisma/schema.prisma
   ```

3. Optional reference seed (Una, Amb, Dhussada, CH/CHC/PHC):

   ```bash
   npx tsx packages/db/prisma/parity-seed.ts
   ```

## Run locally

Terminal 1 — API:

```bash
cp apps/parity-api/.env.example apps/parity-api/.env
# set DATABASE_URL
npm run dev:parity-api
```

Terminal 2 — Web:

```bash
cp apps/parity-web/.env.example apps/parity-web/.env.local
npm run dev:parity-web
```

Open **http://localhost:3001** — product hub chooses **Parity** or **Launch AIDA** (URL from `NEXT_PUBLIC_AIDA_WEB_URL`).

## HTTP API (`/v1/parity/...`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/parity/health` | Liveness |
| GET/POST | `/parity/taxonomy/districts` | List / create |
| GET | `/parity/taxonomy/blocks?districtId=` | List |
| POST | `/parity/taxonomy/blocks` | `{ districtId, name }` |
| GET/POST | `/parity/taxonomy/facility-types` | List / `{ code, label }` |
| GET/POST | `/parity/taxonomy/regions` | List / `{ name }` |
| POST | `/parity/submissions` | Full JSON body (see Zod schema in `@aida/parity-core`) |
| GET | `/parity/submissions?...` | Filtered list |
| GET | `/parity/analytics?...` | Observability bundle |

CORS: set `PARITY_WEB_ORIGIN` to the Parity web origin.

## Deploying “Parity only”

Build and run **only** `parity-api` and `parity-web` with a Postgres that has Parity tables. You do **not** need `api` or `web`. Point users at the Parity web URL; set `NEXT_PUBLIC_AIDA_WEB_URL` if you still want a link to the full suite on another host.

## Excel lineage

Indicators and section grouping mirror the **Haroli** sheet structure in `Excel_Sheets/ANC.xlsx`. Block names in the workbook (Amb, Basdehra, …) are represented as **taxonomy blocks** under a **district**; facilities are free-text **facility names** plus **facility type**.
