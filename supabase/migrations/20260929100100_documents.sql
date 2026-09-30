create type public.embedding_status as enum ('pending', 'processing', 'ready', 'failed');

create table public.documents (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title                 text not null,
  content               text not null,
  tags                  text[] not null default '{}',
  source_type           text not null default 'editor',
  source_filename       text,
  content_hash          text not null,
  embedding_status      public.embedding_status not null default 'pending',
  embedding_error       text,
  embedding_model       text,
  chunk_count           integer not null default 0,
  ingestion_attempts    integer not null default 0,
  next_attempt_at       timestamptz not null default now(),
  processing_started_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint documents_title_length   check (char_length(title) between 1 and 200),
  constraint documents_content_length check (char_length(content) <= 500000),
  constraint documents_tags_count     check (cardinality(tags) <= 20),
  constraint documents_source_type    check (source_type in ('editor', 'upload'))
);

create index documents_user_updated_idx on public.documents (user_id, updated_at desc);
create index documents_tags_idx on public.documents using gin (tags);
create index documents_queue_idx on public.documents (next_attempt_at) where embedding_status in ('pending', 'failed');
create index documents_processing_idx on public.documents (processing_started_at) where embedding_status = 'processing';
create index documents_ready_model_idx on public.documents (embedding_model) where embedding_status = 'ready';

-- Hash + re-queue live in the DB so no code path can change content without re-ingestion.
create or replace function public.documents_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.content_hash := encode(sha256(convert_to(new.title || E'\n' || new.content, 'UTF8')), 'hex');
  if tg_op = 'INSERT' or new.content_hash is distinct from old.content_hash then
    new.embedding_status := 'pending';
    new.embedding_error := null;
    new.ingestion_attempts := 0;
    new.next_attempt_at := now();
    new.processing_started_at := null;
  end if;
  if tg_op = 'UPDATE' and (new.title, new.content, new.tags) is distinct from (old.title, old.content, old.tags) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;
create trigger documents_before_write before insert or update on public.documents
  for each row execute function public.documents_before_write();

alter table public.documents enable row level security;
create policy documents_select_own on public.documents for select to authenticated using (user_id = (select auth.uid()));
create policy documents_insert_own on public.documents for insert to authenticated with check (user_id = (select auth.uid()));
create policy documents_update_own on public.documents for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy documents_delete_own on public.documents for delete to authenticated using (user_id = (select auth.uid()));

-- Ingestion bookkeeping columns are writable only by the service role.
revoke all on table public.documents from anon;
revoke insert, update on table public.documents from authenticated;
grant insert (title, content, tags, source_type, source_filename) on table public.documents to authenticated;
grant update (title, content, tags) on table public.documents to authenticated;

create view public.document_summaries with (security_invoker = true) as
  select id, user_id, title, left(content, 240) as content_preview, char_length(content) as content_length,
         tags, source_type, source_filename, embedding_status, embedding_error, embedding_model,
         chunk_count, ingestion_attempts, next_attempt_at, created_at, updated_at
  from public.documents;
revoke all on table public.document_summaries from anon;
grant select on table public.document_summaries to authenticated;
