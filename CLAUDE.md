# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Settlr** is a cloud-synced React web application for intelligent expense splitting among group members using configurable fairness weights. It combines mathematical correctness with a mobile-first UI, featuring three split methods (Equal, Fairness, Custom Percentage), debt simplification algorithms, and persistent cloud storage via Supabase.

**Key Design Principles:**
- Mathematical correctness: All split calculations maintain invariants (sum of shares = total amount ± 0.01, group net balance = 0)
- Transparency: Every calculation is explainable to build user trust
- Cloud-synced: Real-time updates across devices via Supabase Postgres + Realtime
- Mobile-first: Responsive design optimized for touch (dark mode included)
- Immediate feedback: Optimistic UI updates with rollback on failure

## Tech Stack

- **Frontend**: React 19 + TypeScript 6.0 + Vite 8
- **Styling**: Tailwind CSS 3.4 with dark mode (class-based)
- **State Management**: Zustand 5.0 (client-side cache for cloud data)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Realtime WebSockets)
- **Charts**: Recharts 3.8
- **UI Libraries**: Lucide React 1.14, Framer Motion 12.38, react-hot-toast 2.6
- **Testing**: Vitest 4.1 + fast-check 4.8 (property-based testing)
- **Build**: TypeScript 6.0, Vite 8 with Oxc parser
- **Linting**: ESLint 10.3 with TypeScript/React hooks plugins

## Essential Commands

```bash
# Development
npm run dev              # Start dev server with HMR on localhost:5173

# Building
npm run build           # Full build: tsc -b && vite build (type check + bundle)

# Testing
npm run test            # Run all tests with Vitest
npm run test -- src/    # Run tests in src/ only
npm run test -- --ui    # Run with UI dashboard
npm run coverage        # Generate coverage report (text, json, html)

# Linting
npm run lint            # Check all TypeScript/React code
```

## High-Level Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────┐
│ Presentation Layer (React Components)           │
│ - Auth (LoginForm, SignupForm, ProtectedRoute)  │
│ - Pages (Dashboard, GroupDetail, AnalyticsView) │
│ - Features (AddExpenseModal, SettleUpModal)     │
│ - Layout (Sidebar)                              │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ State Management Layer (Zustand Store)          │
│ useSettlrStore: Groups, Expenses, Settlements   │
│ - Optimistic updates with rollback on failure   │
│ - Real-time subscriptions to Supabase changes   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Repository Layer (DataStore Interface)          │
│ - SupabaseStore: CRUD for Groups/Expenses/etc   │
│ - Maps Postgres schema to domain types          │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Business Logic & Backend                        │
│ - CalculationEngine: Pure split math functions  │
│ - DebtSimplifier: Greedy debt minimization      │
│ - ValidationService: Input validation rules     │
│ - LoggerService: Structured logging + cloud    │
│ - Supabase: Auth, Postgres, RLS, Realtime      │
└─────────────────────────────────────────────────┘
```

### Directory Structure

- **`src/`**
  - **`components/`**: React UI components organized by feature
    - `auth/`: LoginForm, SignupForm, AuthPage, ProtectedRoute
    - `groups/`: GroupDetail, CreateGroupModal, SettleUpModal
    - `expenses/`: AddExpenseModal, ExplanationModal
    - `analytics/`: AnalyticsView (charts & monthly stats)
    - `layout/`: Sidebar navigation
  - **`stores/`**: Zustand store (`useSettlrStore`)—single source of truth for app state
  - **`services/`**: Pure business logic
    - `calculationEngine.ts`: Split math (equal, fairness, custom %), balance calculation, rounding adjustment
    - `debtSimplifier.ts`: Greedy algorithm to minimize transactions
    - `validationService.ts`: Form validation rules (names, amounts, weights, percentages)
    - `loggerService.ts`: Structured logging with cloud sync for errors/warnings
  - **`contexts/`**: React Context (AuthContext for auth state + sign-out)
  - **`lib/`**: Utilities & initialization
    - `supabaseClient.ts`: Supabase JS client setup
    - `supabaseStore.ts`: DataStore implementation (fetch/create/delete groups, expenses, settlements)
    - `dataStore.ts`: DataStore interface (contract for data access)
    - `seed.ts`: Mock data population script
  - **`types/`**: TypeScript domain types (Member, Expense, Settlement, Group, Balance, etc.)
  - **`App.tsx`**: Main component routing, tab navigation (Groups/Analytics/Profile)
  - **`main.tsx`**: React entry point

- **`tests/`**
  - `unit/`: Unit tests for services (CalculationEngine, DebtSimplifier, ValidationService)
  - `property/`: Property-based tests using fast-check (invariant verification)
  - `integration/`: Workflow & Supabase persistence tests
  - `setup.ts`: Vitest setup (jsdom, Testing Library config)
  - Test files in src/ are also discovered (co-location)

- **`public/`**: Static assets
- **`docs/`**: Design document, requirements, tasks

### State Flow Example

```
User adds expense in AddExpenseModal
         ↓
Component calls: addExpense(expense)
         ↓
Zustand store:
  1. Optimistic update: prepend expense with temp UUID
  2. Call SupabaseStore.createExpense(expense)
  3. On success: replace temp UUID with server UUID
  4. On failure: rollback state, show error toast
         ↓
SupabaseStore:
  1. Insert expense + shares into Postgres
  2. Return new expense with server-assigned ID
         ↓
Supabase Realtime:
  1. Broadcasts change to subscribed channels
  2. GroupDetail subscribed → automatically reloads expenses
  3. UI reflects latest data (balances, debts recalculated)
```

## Key Architectural Patterns

### Domain Types (src/types/index.ts)

Core types enforced throughout:
- **`Member`**: id (UUID), userId (nullable for guests), displayName, fairnessWeight, isGuest
- **`Expense`**: id, groupId, title, amount, paidBy (Member.id), date, category, splitMethod, shares[], createdAt
- **`MemberShare`**: memberId, amount, weight? (for fairness), percentage? (for custom)
- **`Settlement`**: id, groupId, fromMember, toMember, amount, date, note?
- **`Group`**: id, name, members[], createdAt, createdBy (user ID)
- **`Balance`**: memberId, displayName, netBalance (positive = creditor, negative = debtor)
- **`SimplifiedDebt`**: from (Member ID), to (Member ID), amount

### Calculation Engine (Pure Functions)

**`CalculationEngine.calculateShares(amount, members, splitMethod, customShares?)`**
- Equal: amount / members.length
- Fairness: (member.weight / totalWeight) × amount
- Custom: (member.percentage / 100) × amount
- Handles rounding errors via adjustForRounding (applies difference to first member)
- **Invariant**: validateShareSum() ensures sum ≈ amount within 0.01 tolerance

**`CalculationEngine.calculateBalances(members, expenses, settlements)`**
- Positive balance = member is creditor (owed money)
- Negative balance = member is debtor (owes money)
- Adjusts for settlements (recorded payments)
- **Invariant**: Sum of all balances ≈ 0 within 0.01 (money conserved)

### Debt Simplifier (Greedy Algorithm)

**`DebtSimplifier.simplify(balances)`**
1. Separate creditors (balance > 0) and debtors (balance < 0)
2. Sort both by magnitude (largest first)
3. Iteratively match largest debtor with largest creditor
4. Settle the minimum of what's owed/due
5. Remove zero-balance members, repeat until done

Result: SimplifiedDebt[] with fewer transactions than direct pairwise settlement.

### Supabase Integration

**Row-Level Security (RLS) Policies:**
- Users can only see/modify groups where they're in group_members table
- Expenses/Settlements isolated to group members
- Groups: authenticated users can create; only creator can delete

**Real-time Subscriptions:**
- GroupDetail component subscribes to expenses and settlements for its group
- Changes broadcast via Supabase Realtime channels
- Automatic store refresh on new/updated/deleted records

**Database Schema:**
- `groups`: id, name, created_at, created_by
- `group_members`: id, group_id, user_id (nullable), display_name, fairness_weight, is_guest, joined_at
- `expenses`: id, group_id, title, amount, paid_by (FK to group_members), date, category, split_method, created_at
- `expense_shares`: id, expense_id, member_id, amount, weight?, percentage?
- `settlements`: id, group_id, from_member, to_member, amount, date, note?, created_at

### Validation Rules (ValidationService)

- **Group name**: Required, max 50 chars
- **Member name**: Required, non-empty
- **Expense amount**: Positive, max 1,000,000
- **Fairness weight**: Positive number (default 1)
- **Custom percentages**: Must sum to 100% ± 0.01
- **Settlement**: Amount > 0, fromMember ≠ toMember

## UI/UX Patterns

### Optimistic Updates
1. User action (e.g., add expense)
2. Store updates immediately with temp ID
3. Async request sent to Supabase
4. On success: replace temp ID with server UUID
5. On failure: rollback + show error toast

### Loading & Error States
- **Skeletons**: During initial data fetch (pulse animation)
- **Spinners**: During mutations (save/delete)
- **Error banners**: Global inline error messages
- **Toasts**: Non-blocking success/failure feedback (bottom-right, dark style)

### Styling Notes
- **Tailwind config**: Primary (emerald), Secondary (indigo), Accent (amber)
- **Dark mode**: `darkMode: 'class'` → toggle with `<html class="dark">`
- **Animations**: Custom fade-in, slide-up keyframes + Framer Motion
- **Rounded corners**: Typically 2xl-3xl (rounded-[2.5rem]) for modern look
- **Color utilities**: Use `dark:` prefix for dark mode, e.g., `bg-white dark:bg-slate-800`

## Testing Strategy

### Unit Tests (Vitest)
- Test CalculationEngine splits with exact amounts
- Test DebtSimplifier preserves balances
- Test ValidationService rules
- Located in `tests/unit/` or co-located with source (`src/**/*.test.ts`)

### Property-Based Tests (fast-check)
- Verify invariants hold across random data:
  - Share sum invariant: sum(shares) = amount ± 0.01
  - Debt simplification: preserves balances, reduces transactions
  - Group balance zero: sum of all balances ≈ 0
- Custom generators in `tests/property/generators.ts`

### Running Tests
```bash
npm run test                    # All tests
npm run test -- tests/unit     # Unit only
npm run test -- --ui           # Watch mode with UI
npm run test -- --run          # Single run (CI mode)
npm run coverage               # Coverage report
```

## Important Code Patterns

### Zustand Store Usage
```typescript
const { groups, addExpense, loadGroups } = useSettlrStore();
// Single hook call gets state + actions
// Automatically triggers re-render on state change
```

### Supabase Client
```typescript
import { supabase } from '@/lib/supabaseClient';
// Environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
// Auth: supabase.auth.signUp(), supabase.auth.signInWithPassword()
// Data: supabase.from('table').select/insert/update/delete()
```

### Type-Safe Expense Creation
```typescript
const expense: Omit<Expense, 'id' | 'createdAt'> = { ... };
await addExpense(expense);
// Server assigns id + createdAt on insert
```

### Calculation Example
```typescript
const shares = CalculationEngine.calculateShares(
  100,           // amount
  group.members, // all members
  'fairness',    // split method
);
const balances = CalculationEngine.calculateBalances(
  group.members,
  expenses,
  settlements
);
const simplified = DebtSimplifier.simplify(balances);
```

## Environment Setup

**Required .env variables:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**.env file exists but is git-ignored** (populated locally for development).

## Known Constraints & Future Work

- **Offline mode**: Planned for Phase 2 (currently cloud-only)
- **Real-time RLS**: Relies on Supabase's Realtime system (eventual consistency, not guaranteed ordering)
- **Floating-point math**: All amounts rounded to 2 decimals; tolerance threshold is 0.01
- **Guest members**: Can be added by name, but cannot sign in (read-only from their perspective if they're invited)

## Common Development Workflows

### Adding a New Expense Category
1. Update `ExpenseCategory` type in `src/types/index.ts`
2. Add icon mapping in `GroupDetail.tsx` (getCategoryIcon function)
3. Update category options in `AddExpenseModal.tsx` form

### Modifying Split Logic
1. Edit `CalculationEngine.calculateShares()` for math changes
2. Update `ExplanationModal.tsx` to explain new split method to users
3. Add property-based test in `tests/property/` to verify invariants

### Adding a New Field to Expense
1. Update `Expense` type in `src/types/index.ts`
2. Update Postgres schema (add column to `expenses` table)
3. Update `SupabaseStore.fetchExpenses()` and `createExpense()` to handle new field
4. Update UI components that display/edit expenses

## Resources

- **Design Doc**: `docs/design.md` — Full architecture, database schema, RLS policies, testing strategy
- **Requirements**: `docs/requirements.md` — User stories & acceptance criteria
- **Tasks**: `docs/tasks.md` — Development task tracker
