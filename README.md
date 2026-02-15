# 🧭 Insight Compass

**Insight Compass** is a premium, automated competitor website tracker built for founders and product teams. It provides deterministic, fact-based intelligence by monitoring competitor site changes, capturing site evolution, and surfacing strategic shifts—all within a stunning, modern interface.

![Premium Glass UI](https://img.shields.io/badge/UI-Premium_Glass-blue)
![Built with Next.js](https://img.shields.io/badge/Built_with-Next.js_14-black)
![Database Supabase](https://img.shields.io/badge/Powered_by-Supabase-green)

---

## ✨ Key Features

- **🔍 Deterministic Change Tracking**: No AI guesswork. Uses Playwright to capture raw HTML and full-page screenshots for 100% factual accuracy.
- **🛡️ Premium Glass UI/UX**: High-end aesthetic featuring glassmorphism, mesh gradients, and dark mode for a professional intelligence experience.
- **📊 Strategic Intelligence Feeds**:
  - **Social Intelligence**: Real-time activity and engagement monitoring.
  - **Pricing Monitor**: Detect pricing model changes and strategic discounts.
  - **PM Intelligence**: Track product updates, CTA shifts, and positioning changes.
- **📸 Snapshot Comparisons**: Side-by-side visual diffs with historic site snapshots stored in Supabase.
- **⚙️ Automated Crawl Workers**: Scheduled background workers (Playwright) that scan competitor landscapes without manual intervention.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | [Next.js 14](https://nextjs.org/) (App Router), TypeScript, [Tailwind CSS](https://tailwindcss.com/) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **UI Components** | [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/) |
| **Backend** | Next.js Server Actions, Node.js scripts |
| **Crawler** | [Playwright](https://playwright.dev/), [Cheerio](https://cheerio.js.org/) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL + RLS) |
| **Auth & Storage** | Supabase Auth, Supabase Storage |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- A Supabase account (Postgres, Auth, and Storage enabled)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Kamal-1711/competitor-tracker.git
   cd competitor-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Initialize Crawl Environment:**
   ```bash
   npx playwright install
   ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the result.

---

## 📁 Project Structure

- `/app`: Next.js App Router pages and layouts.
- `/components`: Reusable React components (UI, insights, dashboard).
- `/lib`: Shared utilities, Supabase client, and business logic.
- `/crawler`: Core Playwright crawling and change detection logic.
- `/supabase`: Migrations and remote configurations.
- `/scripts`: Utility scripts for crawl workers and debugging.

---

## ⚖️ License

Private. All rights reserved.

---

<p align="center">
  Built with ❤️ for precision-focused teams.
</p>
