create table public.memories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.relationship_spaces (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 10000),
  event_date date not null,
  date_precision text not null default 'day' check (date_precision in ('day', 'month', 'year')),
  visibility text not null default 'private' check (visibility in ('shared', 'private')),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  ai_status text not null default 'pending' check (ai_status in ('pending', 'ready', 'failed')),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- timeline: newest first inside one space, id breaks ties for cursor pagination
create index memories_timeline_idx on public.memories (space_id, event_date desc, id desc);

create table public.preference_facts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.relationship_spaces (id) on delete cascade,
  subject_user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 50),
  value text not null check (char_length(value) between 1 and 200),
  source_memory_id uuid references public.memories (id) on delete cascade,
  provenance text not null check (provenance in ('user', 'ai_extracted', 'ai_inferred')),
  status text not null default 'candidate'
    check (status in ('candidate', 'confirmed', 'rejected', 'superseded')),
  confidence real check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  -- BR-07: an AI-made fact must point back to the memory it came from
  check (provenance = 'user' or source_memory_id is not null)
);
