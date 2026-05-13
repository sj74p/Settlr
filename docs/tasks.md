# Implementation Plan: Settlr Expense Splitter

## Overview

This implementation plan breaks down the Settlr application into actionable tasks across 7 phases. The application is a React web app using Supabase for cloud storage, auth, and real-time synchronization.

## Tasks

### PHASE 0 — Supabase Setup (DONE)

- [x] 0.1 Infrastructure Setup
- [x] 0.2 Database Schema Implementation
- [x] 0.3 Row-Level Security (RLS)
- [x] 0.4 Auth Configuration
- [x] 0.5 Client Setup
- [x] 0.6 Environment Configuration
- [x] 0.7 Checkpoint

### PHASE 1 — Foundation & Core Logic (DONE)

- [x] 1. Set up project structure (Vite + React + TypeScript + Tailwind)
- [x] 1.5 Create minimal Hello Settlr landing page
- [x] 2. Define TypeScript interfaces and data models
- [x] 3. Zustand store skeleton
- [x] 4. DataStore Interface & SupabaseStore
- [x] 5. Calculation Engine implementation (Pure functions)
- [x] 6. Debt Simplification Algorithm (Greedy)
- [x] 7. Validation Service
- [x] 8. Mock Data Seed Script
- [x] 9. Unit tests for Calculation Engine
- [x] 10. Property Tests (3 critical properties)
- [x] 11. Checkpoint

### PHASE 1.5 — Authentication UI & Flow (DONE)

- [x] A.1 Signup & Verification UI
- [x] A.2 Login & Session Management
- [x] A.3 Navigation Security
- [x] A.4 Auth Error Handling
- [x] A.5 Checkpoint

### PHASE 2 — Group & Expense Management (DONE)

- [x] 10. Home Page (Dashboard)
- [x] 11. Member Management (Fairness weights & Guests)
- [x] 12. Expense Management
  - [x] Add expense logic
  - [x] Delete expense logic
  - [x] Category Selection UI
- [x] 13. UI Polish
  - [x] ExplanationModal component
- [x] 14. Optimistic Updates
- [x] 15. Checkpoint

### PHASE 3 — Balance & Settlement (DONE)

- [x] 16. Balance Tracking UI (Net Balances view)
- [x] 17. Settlement Functionality
  - [x] Settle Up Modal & recording payments
  - [x] Delete-with-recalculation logic
- [x] 18. Checkpoint

### PHASE 4 — Dashboard & Analytics (DONE)

- [x] 20. Analytics Overview
- [x] 21. Data Visualization
  - [x] Category Pie Chart
  - [x] Member Spending Bar Chart
  - [x] Monthly Trend Line Chart
- [x] 22. Empty States
- [x] 23. Checkpoint

### PHASE 5 — Real-time Sync (DONE)

- [x] R.1 Real-time Subscriptions
- [x] R.2 Lifecycle Management
- [x] R.3 Verification
- [x] R.4 Checkpoint

### PHASE 6 — Polish, Logging & Refinement (DONE)

- [x] 24. Centralized Logging Service (Console + Request Tracing)
- [x] 25. Persistent Cloud Logging (Sync error traces to DB)
- [x] 26. Premium Layout & Navigation (Sidebar)
- [x] 27. Toast Notifications
- [x] 28. Final Verification
- [x] 29. Final Checkpoint

### PHASE 7 — Quality-of-Life Features (IN PROGRESS)

> **DB migrations required before this phase:** Run in Supabase SQL Editor:
> ```sql
> ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;
> ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
> ```

- [ ] 30. Edit Expense
  - [ ] `updateExpense` action in store (optimistic update + rollback)
  - [ ] Full share replacement in `SupabaseStore.updateExpense`
  - [ ] Edit mode in `AddExpenseModal` (pre-fill all fields, call `updateExpense`)
  - [ ] Pencil button on expense rows in `GroupDetail`

- [ ] 31. Expense Notes Field
  - [ ] Add `notes TEXT` column to `expenses` table (migration above)
  - [ ] Add `notes?: string` to `Expense` type
  - [ ] Notes textarea in `AddExpenseModal`
  - [ ] Notes display in `GroupDetail` expense rows

- [ ] 32. Duplicate Expense
  - [ ] Copy button on expense rows — opens `AddExpenseModal` pre-filled with date reset to today
  - [ ] Reuses edit-mode infrastructure from task 30

- [ ] 33. Filter & Search Expenses
  - [ ] Text search by title (client-side)
  - [ ] Category dropdown filter (client-side)
  - [ ] Integrated into `GroupDetail` toolbar

- [ ] 34. Dark / Light Mode Toggle
  - [ ] `src/hooks/useTheme.ts` — reads localStorage + system preference, applies `dark` class to `<html>`
  - [ ] Toggle button in `Sidebar` (Moon/Sun icon)
  - [ ] Persists across sessions via `localStorage`

- [ ] 35. Export to CSV
  - [ ] `src/utils/csvExport.ts` — pure client-side CSV generation
  - [ ] Download button in `GroupDetail` toolbar
  - [ ] Columns: Date, Title, Category, Amount, Paid By, Split Method, Notes

- [ ] 36. Group Totals on Dashboard Cards
  - [ ] Fetch all expenses after loading groups; aggregate per group in store
  - [ ] Show expense count + total spent on each group card in `App.tsx`

- [ ] 37. Group Archive
  - [ ] Add `is_archived BOOLEAN` to `groups` table (migration above)
  - [ ] `archiveGroup` action in store (optimistic update)
  - [ ] Archive button on group cards (hover reveal)
  - [ ] "Show archived" toggle in dashboard; archived groups hidden by default
