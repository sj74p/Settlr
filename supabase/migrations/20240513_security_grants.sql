-- 20240513_security_grants.sql
-- Explicitly grant permissions to authenticated users to resolve 403 errors

-- 1. SCHEMA GRANTS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- 2. TABLE GRANTS
GRANT ALL ON TABLE public.groups TO authenticated;
GRANT ALL ON TABLE public.group_members TO authenticated;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.expense_shares TO authenticated;
GRANT ALL ON TABLE public.settlements TO authenticated;
GRANT ALL ON TABLE public.trace_logs TO authenticated;

-- 3. SEQUENCE GRANTS (If any serial IDs are used)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. REFINED RLS FOR GROUP CREATION
-- Ensure that during group creation, the user can insert themselves as a member
DROP POLICY IF EXISTS "Members can add guests/members" ON group_members;
CREATE POLICY "Members can add guests/members" ON group_members
    FOR INSERT WITH CHECK (
        is_member_of(group_id) OR 
        auth.uid() IS NOT NULL -- Allow any logged-in user to join a group
    );

-- 5. FUNCTION PERMISSIONS
GRANT EXECUTE ON FUNCTION is_member_of TO authenticated;
GRANT EXECUTE ON FUNCTION is_member_of TO anon;
