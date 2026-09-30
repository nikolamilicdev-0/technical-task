create type public.usage_kind as enum ('chat', 'embedding', 'query_rewrite');
create table public.usage_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  kind              public.usage_kind not null,
  provider          text not null,
  model             text not null,
  prompt_tokens     integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens      integer not null default 0 check (total_tokens >= 0),
  estimated         boolean not null default false,
  latency_ms        integer,
  conversation_id   uuid references public.conversations (id) on delete set null,
  message_id        uuid references public.messages (id) on delete set null,
  document_id       uuid references public.documents (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index usage_events_user_created_idx on public.usage_events (user_id, created_at desc);
alter table public.usage_events enable row level security;
create policy usage_events_select_own on public.usage_events for select to authenticated using (user_id = (select auth.uid()));
-- Metering rows are system-written (service role); users only read them.
revoke all on table public.usage_events from anon;
revoke insert, update, delete on table public.usage_events from authenticated;
