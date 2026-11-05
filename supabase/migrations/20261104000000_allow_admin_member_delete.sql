-- Apply to an existing database to enable the member management delete action.
-- The existing foreign keys cascade to this member's match_results and
-- point_history, and set profiles.member_id to NULL. Auth users are retained.
BEGIN;

DROP POLICY IF EXISTS members_delete_admin ON public.members;
CREATE POLICY members_delete_admin ON public.members FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

COMMIT;
