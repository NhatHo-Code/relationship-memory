create extension if not exists vector with schema extensions;

create table public.memory_chunks (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  space_id uuid not null references public.relationship_spaces (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(768) not null,
  embedding_model text not null,
  memory_version integer not null,
  created_at timestamptz not null default now(),
  unique (memory_id, chunk_index)
);

create index memory_chunks_embedding_idx
  on public.memory_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index memory_chunks_space_idx on public.memory_chunks (space_id);

alter table public.memory_chunks enable row level security;
