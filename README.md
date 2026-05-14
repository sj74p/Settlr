# Settlr

Smart expense splitting for groups — with fairness-weighted splits, real-time sync, and automatic debt simplification.

## What it does

Settlr lets you create groups, log shared expenses, and instantly see who owes whom. Unlike simple equal-split apps, Settlr supports **fairness weights** — so if one member earns more or agreed to contribute more, the math reflects that without anyone having to disclose their income.

**Core features:**
- Three split methods: Equal, Fairness-weighted, Custom (% or $)
- Debt simplification — minimises the number of transactions needed to settle up
- Real-time sync across all devices (Supabase Realtime)
- Optimistic UI with automatic rollback on failure
- Analytics: category breakdown, member spending, monthly trends
- Edit, duplicate, search and filter expenses
- Export expenses to CSV
- Group archive, dark/light mode, expense notes
- Full auth with email verification and row-level security

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite 8 |
| Styling | Tailwind CSS 3.4 (dark mode, mobile-first) |
| State | Zustand 5 (optimistic updates + rollback) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Charts | Recharts |
| Animation | Framer Motion |
| Testing | Vitest + fast-check (property-based) |
| CI/CD | GitHub Actions |

## Getting started

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project

### Setup

```bash
git clone https://github.com/sj74p/Settlr.git
cd Settlr
npm install
```

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run the database migrations in your Supabase SQL Editor (files in `supabase/migrations/` in order), then:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Commands

```bash
npm run dev          # Start dev server with HMR
npm run build        # Type-check + production bundle
npm run lint         # ESLint
npm run test         # Run all tests (watch mode)
npm run test:unit    # Unit + BDD tests only (no Supabase needed)
npm run test:ci      # Full test run excluding live integration tests
npm run coverage     # Coverage report
```

## Project structure

```
src/
├── components/
│   ├── auth/          # LoginForm, SignupForm, ProtectedRoute
│   ├── expenses/      # AddExpenseModal, ExplanationModal
│   ├── groups/        # GroupDetail, CreateGroupModal, SettleUpModal
│   ├── analytics/     # AnalyticsView (charts)
│   └── layout/        # Sidebar
├── services/
│   ├── calculationEngine.ts   # Pure split math (equal, fairness, custom)
│   ├── debtSimplifier.ts      # Greedy debt minimisation algorithm
│   └── validationService.ts   # All form validation rules
├── stores/
│   └── useSettlrStore.ts      # Zustand store — single source of truth
├── lib/
│   ├── supabaseStore.ts       # Repository pattern: CRUD via Supabase
│   └── dataStore.ts           # DataStore interface contract
├── hooks/
│   └── useTheme.ts            # Dark/light mode with localStorage persistence
├── utils/
│   └── csvExport.ts           # Client-side CSV generation
└── types/
    └── index.ts               # Domain types (Member, Expense, Settlement, Group…)

tests/
├── unit/                      # ValidationService, DebtSimplifier, csvExport
├── bdd/                       # Scenario tests (Given/When/Then)
└── properties.test.ts         # fast-check invariant tests
```

## How the split math works

**Equal:** `amount / members.length` — rounding remainder applied to the first member.

**Fairness:** `(member.weight / totalWeight) × amount` — weights are positive numbers, default 1. A member with weight 2 pays twice as much as one with weight 1.

**Custom:** User specifies either a percentage per member (must sum to 100%) or a dollar amount per member (must sum to the total).

All methods guarantee: `sum(shares) = amount ± 0.01`.

**Debt simplification** uses a greedy algorithm — sort creditors and debtors by magnitude, match largest debtor to largest creditor, repeat. Typically reduces N×(N-1) pairwise debts to N-1 transactions.

## Database schema

```
groups            id, name, created_by, is_archived, created_at
group_members     id, group_id, user_id (nullable), display_name, fairness_weight, is_guest
expenses          id, group_id, title, amount, paid_by, date, category, split_method, notes, created_at
expense_shares    id, expense_id, member_id, amount, weight?, percentage?
settlements       id, group_id, from_member, to_member, amount, date, note, created_at
```

Row-Level Security ensures users can only read and write data for groups they belong to.

## Deploying

1. Import the GitHub repo
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables
3. Deploy

**CI:** The GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint → type-check → unit/BDD tests → property tests → build on every push. Add the two Supabase env vars as repository secrets to enable the live integration test.

## License

MIT
