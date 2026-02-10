# Domain Model

Business-oriented definitions of the main entities. No code—concepts and relationships only.

---

## Competitor

A **competitor** is a website you want to track. It has a base URL (e.g. the homepage), a display name (often the domain), and belongs to a single workspace. You configure how often the system should crawl it (daily or weekly). The system records when it was last crawled so it knows when it’s due for the next run. Competitors can be soft-deleted so history is kept but they no longer appear in active lists or schedules.

---

## Page

A **page** is a specific URL on a competitor’s site that we treat as a first-class trackable unit (e.g. homepage, pricing page, a product or services page). Each page belongs to one competitor and has a **page type**: homepage, pricing, or product. The same logical URL per competitor is stored once; multiple snapshots over time are linked to this page. Pages are discovered and created during crawls; they can be soft-deleted if the URL is no longer relevant.

---

## Crawl Job

A **crawl job** is one execution of “crawl this competitor now.” It is created when a user clicks “Crawl now” or when the scheduler decides this competitor is due. The job has a status: pending (queued), running (in progress), completed (success), or failed (error). It records when it started and finished and, if it failed, an error message. All snapshots produced in that run are tied to this job. Crawl jobs are immutable once completed; they are not soft-deleted.

---

## Snapshot

A **snapshot** is a point-in-time capture of one page during one crawl: the full HTML and a full-page screenshot. It is linked to a competitor, a page, and the crawl job that produced it. Snapshots are used to compare “before” and “after” when detecting changes. Screenshots are stored in object storage; the snapshot row holds the path and optional public URL. Snapshots are kept for history and are not soft-deleted.

---

## Change

A **change** is a single detected difference between two snapshots of the same page (before vs after). It records what kind of change it was (e.g. text change, element added/removed, CTA text change, nav change), a short summary, and optional structured details. It is linked to the competitor, the page, and the before/after snapshot IDs. Each change has a **change category** (see below). Changes are append-only evidence and are not soft-deleted.

---

## Change Category

A **change category** is a business label applied to a change so you can filter and reason about it. Categories are assigned by rule-based logic (no AI). The standard set:

- **Positioning & Messaging** — e.g. CTA or headline text changes.
- **Pricing & Offers** — any change on a pricing page.
- **Product / Services** — new or updated product/service pages or content.
- **Trust & Credibility** — e.g. logos, testimonials, reviews.
- **Navigation / Structure** — nav, footer, or structural layout changes.

---

## Alert

An **alert** is a user-facing notification that “something you care about happened.” It is tied to a change (or a set of changes) and optionally to a competitor or workspace. Alerts can be “unread” until the user dismisses them; they may be delivered in-app only (e.g. a bell icon with count) or, in a future design, via email or webhook. Alerts are the bridge between raw change data and “tell me when X happens.” They can be soft-deleted or marked read so they no longer clutter the UI.
