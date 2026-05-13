# Requirements Document

## Introduction

Settlr is a smart expense splitting web application that enhances traditional expense sharing by introducing fairness intelligence based on configurable member weights. The system allows users to create groups, track shared expenses, and automatically calculate fair splits using multiple methods including weight-based distribution. Members can be assigned fairness weights that reflect their agreed contribution share, enabling flexible and transparent expense splitting without requiring income disclosure. The application provides visual summaries, simplified debt calculations, settlement recording, and a modern mobile-first interface with persistent cloud storage via Supabase.

## Glossary

- **Settlr_System**: The complete web application including UI, state management, and cloud storage
- **Group**: A collection of members who share expenses together
- **Member**: An individual participant in a group (either a registered user or a guest)
- **Guest_Member**: A member added by name only, without a registered account
- **Expense**: A financial transaction paid by one member that needs to be split among group members
- **Split_Method**: The algorithm used to divide an expense (Equal, Fairness, or Custom Percentage)
- **Fairness_Mode**: Expense splitting based on configurable per-member weights that reflect each member's agreed contribution share
- **Fairness_Weight**: A positive number assigned to each member representing their relative share contribution. Default is 1
- **Balance**: The net amount owed between members after all expenses are calculated
- **Debt_Simplification**: Algorithm that reduces the number of transactions needed to settle all balances
- **Fairness_Score**: A visual indicator explaining how fairness logic was applied to an expense
- **Settlement**: A recorded payment between two members that adjusts their balances
- **Monthly_Summary**: Aggregated statistics and visualizations for a group's expenses within a month
- **Category**: A classification label for expenses (e.g., Food, Transport, Entertainment)
- **Supabase**: The backend-as-a-service provider used for Postgres, Auth, and Realtime sync

## Requirements

### Requirement 1: Group Management

**User Story:** As a user, I want to create and manage expense groups with members, so that I can organize shared expenses by context (e.g., roommates, trip, friends).

#### Acceptance Criteria

1. THE Settlr_System SHALL allow authenticated users to create a new group with a name
2. WHEN creating a group, THE creator SHALL be able to add members as either guests (name-only) or via email invite (registered users)
3. THE Settlr_System SHALL display a list of all groups where the current user is a member
4. WHEN a user selects a group, THE Settlr_System SHALL navigate to the group detail view
5. THE Settlr_System SHALL persist all group data to Supabase (PostgreSQL)
6. THE Settlr_System SHALL prevent non-authenticated users from viewing or modifying groups
7. THE Settlr_System SHALL allow users to edit member information (names, weights) after creation
8. THE Settlr_System SHALL allow users to delete groups they created

### Requirement 2: Expense Creation and Split Preview

**User Story:** As a user, I want to add expenses with flexible split methods and see how they will be divided before saving, so that I can ensure the split is fair and accurate.

#### Acceptance Criteria

1. WHEN a user is viewing a group, THE Settlr_System SHALL provide a form to add a new expense
2. THE Settlr_System SHALL require: title, amount, paid by member, date, category, and split method
3. THE Settlr_System SHALL support three split methods: Equal, Fairness, and Custom Percentage
4. WHEN a user enters expense details, THE Settlr_System SHALL display a live preview showing each member's calculated share
5. WHEN the split method is Equal, THE Settlr_System SHALL divide the amount equally among all members
6. WHEN the split method is Fairness, THE Settlr_System SHALL calculate shares proportional to each member's fairness weight
7. WHEN the split method is Custom Percentage, THE Settlr_System SHALL allow users to specify each member's percentage share
8. THE Settlr_System SHALL validate that custom percentages sum to 100% before allowing save
9. THE Settlr_System SHALL validate that the amount is a positive number
10. WHEN a user saves an expense, THE Settlr_System SHALL persist it to Supabase
11. FOR ALL valid expense objects, THE Settlr_System SHALL maintain the invariant that the sum of all member shares equals the total expense amount within 0.01 tolerance

### Requirement 3: Balance Tracking and Debt Simplification

**User Story:** As a user, I want to see who owes whom in a simplified format, so that I can settle debts with the minimum number of transactions.

#### Acceptance Criteria

1. WHEN a user views a group, THE Settlr_System SHALL display a balance summary showing net amounts owed
2. THE Settlr_System SHALL calculate each member's net balance by subtracting their share of expenses from amounts they paid
3. THE Settlr_System SHALL apply debt simplification to reduce the number of required transactions
4. THE Settlr_System SHALL display simplified debts as "Member A owes Member B $X" statements
5. THE Settlr_System SHALL display balances with two decimal places
6. WHEN all expenses are settled, THE Settlr_System SHALL show the message: "All settled up! 🎉"

### Requirement 4: Fairness Mode Intelligence

**User Story:** As a user, I want expenses to be split based on flexible fairness weights rather than strict equality, so that members who can or should contribute more do so proportionally.

#### Acceptance Criteria

1. THE Settlr_System SHALL allow each group member to be assigned a fairness_weight (default: 1)
2. WHEN a user creates or edits a member, THE Settlr_System SHALL allow them to set the weight via preset options (Low = 0.5, Equal = 1, High = 2) or a custom number
3. WHEN the split method is "Fairness", THE Settlr_System SHALL calculate each member's share using: member_share = (member_weight / sum_of_all_weights) × expense_amount
4. THE Settlr_System SHALL allow per-expense weight overrides
5. THE Settlr_System SHALL display a Fairness_Score badge on fairness-split expenses
6. THE Settlr_System SHALL provide a "Why this split?" link explaining the weight math step-by-step

### Requirement 5: Monthly Summary Dashboard

**User Story:** As a user, I want to see aggregated statistics and visualizations for my group's monthly expenses.

#### Acceptance Criteria

1. THE Settlr_System SHALL provide a monthly summary dashboard for each group
2. THE Settlr_System SHALL display total spent, category breakdown (pie chart), top spender, and biggest expense
3. THE Settlr_System SHALL display the current user's net balance
4. WHEN a user changes the month, THE Settlr_System SHALL recalculate all summary statistics

### Requirement 6: User Interface and Experience

**User Story:** As a user, I want a clean, modern, mobile-first interface with dark mode support.

#### Acceptance Criteria

1. THE Settlr_System SHALL implement a mobile-first responsive design using Tailwind CSS
2. THE Settlr_System SHALL provide a dark mode toggle that persists across sessions
3. THE Settlr_System SHALL display loading states (skeletons or spinners) during all network operations
4. THE Settlr_System SHALL show a retry banner if a data operation fails
5. THE Settlr_System SHALL show an offline banner when the browser loses connectivity

### Requirement 7: Cloud Sync and State Management

**User Story:** As a user, I want my data to stay in sync across all my devices automatically.

#### Acceptance Criteria

1. THE Settlr_System SHALL use Supabase as the primary persistent data store
2. THE Settlr_System SHALL implement Row-Level Security (RLS) to ensure data isolation between groups
3. THE Settlr_System SHALL use Zustand for client-side state management, acting as a cache for cloud data
4. WHEN data is modified locally, THE Settlr_System SHALL perform an optimistic update and sync with Supabase
5. THE Settlr_System SHALL synchronize updates from other members in real-time

### Requirement 13: User Authentication

**User Story:** As a user, I want to create an account and log in securely.

#### Acceptance Criteria

1. THE Settlr_System SHALL provide email/password signup and login
2. THE Settlr_System SHALL block login for unverified emails (email verification required)
3. THE Settlr_System SHALL handle session expiry by redirecting to login with a "Session expired" message
4. THE Settlr_System SHALL allow users to manage a global display name and avatar

### Requirement 14: Multi-User Groups with Guest Members

**User Story:** As a creator, I want to add both registered users and guest members to my group.

#### Acceptance Criteria

1. THE Settlr_System SHALL support "Guest" members who have no account and are tracked by name only
2. THE Settlr_System SHALL allow a Guest to be "claimed" by a registered user via email invite
3. THE Settlr_System SHALL ensure only members of a group can view its expenses or settlements

### Requirement 15: Real-time Updates

**User Story:** As a member, I want to see other members' changes immediately.

#### Acceptance Criteria

1. THE Settlr_System SHALL subscribe to database changes for the active group
2. WHEN any member adds/edits/deletes an expense, THE Settlr_System SHALL update all other members' UIs within 2 seconds

### Requirement 16: Expense Editing and Duplication

**User Story:** As a user, I want to fix mistakes in expenses and quickly re-add similar ones.

#### Acceptance Criteria

1. THE Settlr_System SHALL provide an edit button on each expense that opens the expense form pre-filled
2. WHEN editing an expense, THE Settlr_System SHALL replace expense shares atomically (delete old, insert new)
3. THE Settlr_System SHALL provide a duplicate button that opens the form pre-filled with today's date
4. THE Settlr_System SHALL allow an optional notes field on each expense

### Requirement 17: Expense Discovery

**User Story:** As a user, I want to find specific expenses quickly in long lists.

#### Acceptance Criteria

1. THE Settlr_System SHALL provide a real-time text search that filters expenses by title
2. THE Settlr_System SHALL provide a category dropdown that filters the expense list
3. THE Settlr_System SHALL provide an Export to CSV button that downloads the current (filtered) expense list
4. The CSV SHALL include columns: Date, Title, Category, Amount, Paid By, Split Method, Notes

### Requirement 18: Theming and Group Management

**User Story:** As a user, I want a dark/light mode toggle and the ability to hide old groups.

#### Acceptance Criteria

1. THE Settlr_System SHALL provide a dark/light mode toggle in the sidebar that persists to localStorage
2. WHEN no stored preference exists, THE Settlr_System SHALL respect the OS-level color scheme preference
3. THE Settlr_System SHALL display expense count and total spent on each group dashboard card
4. THE Settlr_System SHALL allow archiving a group (soft-delete); archived groups are hidden by default
5. THE Settlr_System SHALL provide a toggle to show/hide archived groups
