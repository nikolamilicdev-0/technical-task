create table public.document_chunks (
  id                    uuid primary key default gen_random_uuid(),
  document_id           uuid not null references public.documents (id) on delete cascade,
  user_id               uuid not null references auth.users (id) on delete cascade,
  document_content_hash text not null,
  chunk_index           integer not null check (chunk_index >= 0),
  content               text not null,
  heading_path          text not null default '',
  token_count           integer not null check (token_count >= 0),
  content_hash          text not null,
  embedding             extensions.vector(1536) not null,
  embedding_model       text not null,
  tsv                   tsvector generated always as (
                          setweight(to_tsvector('english', heading_path), 'A') ||
                          setweight(to_tsvector('english', content), 'B')) stored,
  created_at            timestamptz not null default now(),
  constraint document_chunks_document_hash_key unique (document_id, content_hash)
);
create index document_chunks_document_order_idx on public.document_chunks (document_id, chunk_index);
create index document_chunks_user_model_idx on public.document_chunks (user_id, embedding_model);
create index document_chunks_embedding_idx on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index document_chunks_tsv_idx on public.document_chunks using gin (tsv);

alter table public.document_chunks enable row level security;
create policy document_chunks_select_own on public.document_chunks for select to authenticated using (user_id = (select auth.uid()));
revoke all on table public.document_chunks from anon;
revoke insert, update, delete on table public.document_chunks from authenticated;
