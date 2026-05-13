# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run start    # start production server
npm run lint     # run ESLint
```

No test runner is configured yet.

## Project Purpose

Retail analytics MVP built around the Billz API. Delivers daily reports to store owners via Telegram answering: "Where is the store losing money today?"

Four insights only (MVP scope):
- **Dead Stock** — products in stock, not sold for 7+ days
- **Revenue Drop** — today vs yesterday revenue, triggers at >20% drop
- **Overstock** — stock exceeds estimated 30-day sales volume
- **Discount/Return Anomalies** — threshold-based detection of excessive discounts or unusual returns

## Tech Stack

- **Next.js 16** with App Router (see warning below)
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **MongoDB + Mongoose** — minimal usage; store users, tokens, and essential metadata only
- **Telegraf** — Telegram bot delivery
- **Axios** — Billz API calls
- **Vercel Cron** — daily scheduled reports

## Next.js Version Warning

This project uses Next.js 16, which has breaking changes from earlier versions. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`. APIs, conventions, and file structure may differ from training data.

## Data Flow

```
Billz API → fetch raw data → calculate insights → generate Telegram message → send report
```

Prefer this over storing and aggregating. Database is for users, tokens, and essential metadata only — not analytics storage.

## Architecture Rules

Organize by feature/domain. Keep modules and functions small with explicit logic.

**Do not implement** (explicitly forbidden for MVP):
- microservices, CQRS, event sourcing
- WebSockets, GraphQL
- RBAC or complex auth
- plugin systems, repository pattern abstractions, domain-driven architecture
- AI chat assistant
- client dashboard, charts, multi-store support, team accounts

## Environment Variables

Required env vars (see `.env`):
- `MONGODB_URI`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
- `BILLZ_API_URL_V1`, `BILLZ_API_URL_V2`, `BILLZ_SECRET_KEY`
- `CRON_SECRET`
