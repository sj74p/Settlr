-- 20240513_initial_schema.sql
-- Settlr Initial Database Schema
-- Optimized for Supabase with RLS and Security Definer helpers

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES
-- Groups
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Group Members (Linking users to groups, or guest names)
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    fairness_weight DECIMAL(10,2) DEFAULT 1.0,
    is_guest BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    paid_by UUID REFERENCES group_members(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT DEFAULT 'Other',
    split_method TEXT NOT NULL CHECK (split_method IN ('equal', 'fairness', 'custom')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Shares (Who owes what for a specific expense)
CREATE TABLE IF NOT EXISTS expense_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
    member_id UUID REFERENCES group_members(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    weight DECIMAL(10,2),
    percentage DECIMAL(5,2),
    UNIQUE(expense_id, member_id)
);

-- Settlements (Recording debt payments)
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    from_member UUID REFERENCES group_members(id) ON DELETE RESTRICT,
    to_member UUID REFERENCES group_members(id) ON DELETE RESTRICT,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SECURITY DEFINER HELPER
-- Required to avoid infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION is_member_of(_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = _group_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS POLICIES
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Group Policies
DO $$ BEGIN
    CREATE POLICY "Users can view groups they belong to" ON groups
        FOR SELECT USING (is_member_of(id));
    CREATE POLICY "Users can create groups" ON groups
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Group Member Policies
DO $$ BEGIN
    CREATE POLICY "Members can view other members in same group" ON group_members
        FOR SELECT USING (is_member_of(group_id));
    CREATE POLICY "Members can add guests/members" ON group_members
        FOR INSERT WITH CHECK (is_member_of(group_id) OR auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Expense Policies
DO $$ BEGIN
    CREATE POLICY "Members can view expenses" ON expenses
        FOR SELECT USING (is_member_of(group_id));
    CREATE POLICY "Members can add expenses" ON expenses
        FOR INSERT WITH CHECK (is_member_of(group_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Expense Share Policies
DO $$ BEGIN
    CREATE POLICY "Members can view shares" ON expense_shares
        FOR SELECT USING (EXISTS (
            SELECT 1 FROM expenses WHERE expenses.id = expense_id AND is_member_of(group_id)
        ));
    CREATE POLICY "Members can add shares" ON expense_shares
        FOR INSERT WITH CHECK (EXISTS (
            SELECT 1 FROM expenses WHERE expenses.id = expense_id AND is_member_of(group_id)
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Settlement Policies
DO $$ BEGIN
    CREATE POLICY "Members can view settlements" ON settlements
        FOR SELECT USING (is_member_of(group_id));
    CREATE POLICY "Members can add settlements" ON settlements
        FOR INSERT WITH CHECK (is_member_of(group_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
