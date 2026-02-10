# Product check checklist

Use this to verify the app end-to-end.

---

## Before you start

1. **Env** – Create `.env.local` with:
   - `NEXT_PUBLIC_SUPABASE_URL` – from [Supabase → Project Settings → API](https://supabase.com/dashboard/project/_/settings/api)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for crawler/worker)

2. **Dev server** – From project root:
   ```powershell
   cd "d:\Cursor project\Competitor tracker"
   npm run dev
   ```
   Open the URL shown (e.g. **http://localhost:3000** or **http://localhost:3001** if 3000 is in use).

3. **Auth** – You need at least one user. In Supabase Dashboard → Authentication → Users, create a user (email + password) or use Sign up if you added that page.

---

## 1. Home page

- [ ] Open `/` – title “Competitor Tracker” and links **Go to Competitors** / **Change Feed**.
- [ ] Click **Go to Competitors** – you should land on `/dashboard/competitors` (or be redirected to login if not signed in).

---

## 2. Competitors page

- [ ] **Not signed in** – Redirect to `/login` (or 500 if Supabase env is missing).
- [ ] **Signed in, no competitors** – Empty state: “No competitors yet” and “Add a website above…”.
- [ ] Click **Add competitor** – Dialog: Website URL, Crawl frequency (Daily/Weekly). Submit with a valid URL (e.g. `https://example.com`).
- [ ] After adding one – Table row: Name, URL, Crawl frequency, Last crawl (“—”), Status (“Never crawled”), Edit / Run crawl now / Delete.
- [ ] **No crawls yet** – Banner: “No crawls yet” and “Run a crawl for any competitor below…”.
- [ ] **Run crawl now** – Click for one competitor. Button shows “Running…” and is disabled. (Crawl only finishes if the worker is running; see below.)

---

## 3. Change Feed page

- [ ] **No competitors** – Message: “No competitors yet” and “Add competitors on the Competitors page…”.
- [ ] **Competitors but no changes** – Empty state: “No changes detected yet” and “Once you run crawls…”.
- [ ] **With filters** – Set competitor, category, or date range. If no results: “No changes match your filters”.
- [ ] **With changes** – List of cards: Competitor, Page URL, Category, Timestamp, Before/After screenshots. Pagination (Previous/Next) and “Showing X–Y of Z”.

---

## 4. Crawls (optional, needs worker)

To actually run crawls and see changes:

1. In Supabase, create a **Storage bucket** (e.g. `screenshots`) and make it public if you want screenshot URLs to work.
2. Run migrations (Supabase Dashboard → SQL or `supabase db push`) so `crawl_jobs`, `snapshots`, `changes`, `enqueue_crawl_job`, etc. exist.
3. In a **second terminal** (env loaded), run the crawl worker:
   ```powershell
   cd "d:\Cursor project\Competitor tracker"
   npm run crawl-worker
   ```
   Run it whenever you want to process “Run crawl now” or scheduled jobs.

4. On Competitors, click **Run crawl now** for a competitor. In the worker terminal you should see it pick up the job and run. When it finishes, refresh – Last crawl and Status should update, and Change Feed may show new changes.

---

## 5. Quick smoke test (no worker)

- [ ] Home loads.
- [ ] With valid Supabase env and a user: sign in, open Competitors, see empty state; add one competitor; see “No crawls yet” and the table; open Change Feed, see “No changes detected yet”.
- [ ] Env missing: opening `/dashboard/*` shows the “Supabase env vars missing” message instead of a crash.

---

## URLs

| Page           | URL                          |
|----------------|------------------------------|
| Home           | `/`                          |
| Competitors    | `/dashboard/competitors`     |
| Change Feed    | `/dashboard/changes`         |
| Login (if used)| `/login`                     |

Use **http://localhost:3000** (or the port your `npm run dev` prints).
