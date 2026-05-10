@AGENTS.md
# Project Overview

Retail analytics MVP built around Billz API.

The product helps store owners identify where they are losing money daily using simple actionable insights delivered through Telegram.

The system should remain lightweight, fast to iterate, and easy to maintain.

---

# Main Goal

Answer one question clearly:

"Where is the store losing money today?"

---

# Current MVP Scope

The MVP only includes:

- Billz API integration
- Simple insight calculations
- Telegram delivery
- Daily scheduled reports

---

# Insights Included

Only these 4 insights exist initially:

## 1. Dead Stock

Products:
- in stock
- not sold for 7+ days

Purpose:
identify frozen capital.

---

## 2. Revenue Drop

Compare:
- today revenue
- yesterday revenue

Trigger:
- revenue drop > 20%

---

## 3. Overstock

Products with:
- high stock
- low sales velocity

Simple logic:
stock exceeds estimated 30-day sales volume.

---

## 4. Discount / Return Anomalies

Detect:
- excessive discounts
- unusual return activity

Use simple threshold-based detection.

---

# Current Delivery Channel

Telegram only.

No web dashboard for the MVP phase.

---

# Future Scope (NOT current priority)

These features may be added later:

- Client dashboard
- Charts and visual analytics
- Multi-store support
- Team accounts
- AI-generated recommendations
- More advanced analytics
- Filters and customization

Do not build these unless explicitly requested.

---

# Tech Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- TypeORM
- Telegraf
- Axios
- Vercel Cron

---

# Architecture Philosophy

Keep everything:
- simple
- readable
- maintainable

Prefer direct implementations over abstractions.

Avoid enterprise architecture patterns unless absolutely necessary.

---

# Architecture Rules

## Preferred

- small modules
- small functions
- explicit logic
- readable code
- minimal dependencies
- pragmatic solutions

---

## Avoid

- premature optimization
- overengineering
- unnecessary abstractions
- deeply nested architecture
- generic reusable systems too early

---

# Explicitly Forbidden (for now)

Do NOT implement:

- microservices
- CQRS
- event sourcing
- websocket systems
- GraphQL
- RBAC systems
- complex auth
- plugin systems
- repository pattern abstractions
- domain-driven architecture
- AI chat assistant

---

# Data Flow

Billz API
↓
Fetch raw data
↓
Calculate insights
↓
Generate Telegram message
↓
Send report

---

# Database Philosophy

Database usage should remain minimal during MVP.

Only store:
- users
- tokens
- essential metadata

Avoid building analytics storage infrastructure initially.

Prefer:
fetch -> calculate -> send

instead of:
store -> aggregate -> warehouse

---

# Code Style Preferences

## General

- Use strict TypeScript
- Prefer async/await
- Keep functions focused
- Avoid giant files
- Avoid magic values
- Use descriptive naming

---

## Comments

- Write comments only when necessary
- Do not explain obvious code
- Prefer self-explanatory code

---

## Error Handling

- Fail clearly
- Log useful information
- Avoid silent failures

---

# Folder Structure Philosophy

Organize by feature/domain.

Avoid:
- excessive layering
- abstract folders
- unnecessary indirection

---

# Development Workflow

Build incrementally.

Each task should be:
- isolated
- testable
- small enough to review quickly

Do NOT attempt to generate the entire MVP at once.

---

# Priority Order

1. Telegram bot
2. Billz API integration
3. Insight calculation
4. Scheduler
5. Pilot testing
6. Future dashboard

---

# Important Reminder

This is an MVP.

Shipping fast is more important than architectural perfection.

The primary objective is validating whether store owners care about the insights.

Keep momentum high.