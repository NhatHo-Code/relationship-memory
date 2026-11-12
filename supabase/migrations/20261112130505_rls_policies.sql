alter table public.profiles enable row level security;
alter table public.relationship_spaces enable row level security;
alter table public.space_memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.memories enable row level security;
alter table public.preference_facts enable row level security;

-- security definer: lets policies check membership without recursive RLS on space_memberships
create function public.is_active_member(p_space_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.space_memberships
    where space_id = p_space_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "spaces: members read" on public.relationship_spaces
  for select to authenticated using (public.is_active_member(id));

create policy "memberships: members read" on public.space_memberships
  for select to authenticated using (public.is_active_member(space_id));

create policy "memories: shared or own" on public.memories
  for select to authenticated
  using (
    public.is_active_member(space_id)
    and (visibility = 'shared' or creator_id = (select auth.uid()))
  );

-- invitations, preference_facts: RLS on, no policy => anon/authenticated see nothing.
-- No insert/update/delete policies anywhere: every write goes through the Express API.
