-- 1-1 with auth.users (Supabase Auth owns identity, we own profile data)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  locale text not null default 'vi',
  timezone text not null default 'Asia/Ho_Chi_Minh', -- IANA name (BR-09)
  created_at timestamptz not null default now()
);

-- auto-create a profile when a user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------------

create table public.relationship_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.space_memberships (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.relationship_spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'partner')),
  status text not null default 'active' check (status in ('active', 'left')),
  joined_at timestamptz not null default now(),
  unique (space_id, user_id)
);

-- "which spaces am I in?" is the hottest query of the whole app
create index space_memberships_user_active_idx
  on public.space_memberships (user_id) where status = 'active';

-- exactly one owner per space, enforced by the database
create unique index space_memberships_one_owner_idx
  on public.space_memberships (space_id) where role = 'owner';

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.relationship_spaces (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique, -- never store the raw token (B8)
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'accepted' or accepted_at is not null)
);
