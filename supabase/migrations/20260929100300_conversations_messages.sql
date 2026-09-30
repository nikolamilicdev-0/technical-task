create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_title_length check (title is null or char_length(title) between 1 and 120)
);
create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);

create type public.message_role as enum ('user', 'assistant');

create table public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations (id) on delete cascade,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role              public.message_role not null,
  content           text not null,
  citations         jsonb not null default '[]'::jsonb,
  metadata          jsonb not null default '{}'::jsonb,
  provider          text,
  model             text,
  finish_reason     text,
  prompt_tokens     integer,
  completion_tokens integer,
  usage_estimated   boolean not null default false,
  created_at        timestamptz not null default now(),
  constraint messages_content_length  check (char_length(content) <= 100000),
  constraint messages_citations_array check (jsonb_typeof(citations) = 'array'),
  constraint messages_metadata_object check (jsonb_typeof(metadata) = 'object')
);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();

create or replace function public.touch_conversation_on_message() returns trigger language plpgsql set search_path = '' as $$
begin update public.conversations set updated_at = now() where id = new.conversation_id; return new; end; $$;
create trigger messages_touch_conversation after insert on public.messages for each row execute function public.touch_conversation_on_message();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
create policy conversations_select_own on public.conversations for select to authenticated using (user_id = (select auth.uid()));
create policy conversations_insert_own on public.conversations for insert to authenticated with check (user_id = (select auth.uid()));
create policy conversations_update_own on public.conversations for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy conversations_delete_own on public.conversations for delete to authenticated using (user_id = (select auth.uid()));
create policy messages_select_own on public.messages for select to authenticated using (user_id = (select auth.uid()));
create policy messages_insert_own on public.messages for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));
revoke all on table public.conversations from anon;
revoke all on table public.messages from anon;
-- Messages are immutable; they disappear with their conversation (cascade).
revoke update, delete on table public.messages from authenticated;
