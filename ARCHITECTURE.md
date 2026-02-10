# Architecture

## Stack Overview

| Layer        | Technology                          | Role |
|-------------|--------------------------------------|------|
| Frontend    | Next.js 14 App Router + TypeScript   | Pages, forms, change feed, competitor management |
| Backend     | Next.js Server Actions + Node scripts| Auth, CRUD, crawl triggering, change detection |
| Crawling    | Playwright (Node)                    | Browser automation, HTML + full-page screenshots |
| Database    | Supabase (PostgreSQL)                | Users, workspaces, competitors, jobs, pages, snapshots, changes |
| Storage     | Supabase Storage                     | Screenshot binaries, public URLs |
| Auth        | Supabase Auth                        | Email/password, session, protected routes |
| Scheduling  | Supabase Edge Functions (cron)       | Scheduled crawl dispatch |

**No AI libraries. No third-party scrapers or change-detection APIs.**

## Why This Architecture

- **Next.js App Router**: Single codebase for UI and server logic; Server Actions keep forms and triggers simple without a separate API layer. Good fit for a focused SaaS-style app.
- **Server Actions + Node scripts**: Business logic (crawl trigger, idempotency, change persistence) lives on the server. Scripts (e.g. smoke tests, one-off jobs) reuse the same Node/Playwright and Supabase clients.
- **Playwright**: Real browser rendering, JS execution, and full-page screenshots. More reliable than raw HTTP + regex for modern SPAs and dynamic content. Runs in Node (no separate “browser MCP” in production).
- **Supabase (Postgres + Storage + Auth)**: One vendor for database, file storage, and auth; RLS and service role separate tenant data and background jobs. Reduces moving parts and ops.
- **No AI**: Scope is deterministic change tracking only. Avoids model cost, latency, and ambiguity; keeps the product easy to reason about and support.
- **No external scrapers**: We control the crawler (Playwright), the schema, and the change-detection rules. No dependency on external scraping or change-detection services.

## Data and Execution Flow

1. **User** signs in (Supabase Auth), manages competitors and crawl frequency (Server Actions → Postgres).
2. **Crawl** is triggered manually (Server Action) or by schedule (Edge Function). A crawl job row is created; idempotency checks prevent duplicate runs.
3. **Playwright** (Node) visits competitor URLs, discovers pages (homepage, pricing, product), captures HTML and full-page screenshots.
4. **Snapshots** (HTML + screenshot path) are written to Postgres and Storage; competitor’s `last_crawled_at` is updated.
5. **Change detection** (Node, Cheerio) compares previous vs current snapshot HTML; rules assign categories; results are stored in `changes` with before/after snapshot references.
6. **Change feed** is served from Postgres (filtered by competitor, category, date); UI shows timeline, screenshots, and categories.

All persistence is Supabase (Postgres + Storage); auth and tenant boundaries use Supabase Auth and workspace/competitor ownership.
