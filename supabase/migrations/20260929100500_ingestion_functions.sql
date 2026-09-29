-- Worker-only state machine. `security invoker`: the service role bypasses RLS; users are denied execute.
create or replace function public.claim_pending_documents(p_batch_size integer default 5, p_stale_after_minutes integer default 10, p_max_attempts integer default 5)
returns table (id uuid, user_id uuid, title text, content text, content_hash text, ingestion_attempts integer)
language sql volatile security invoker set search_path = '' as $$
  with candidates as (
    select d.id from public.documents d
    where (d.embedding_status = 'pending' and d.next_attempt_at <= now())
       or (d.embedding_status = 'failed' and d.ingestion_attempts < p_max_attempts and d.next_attempt_at <= now())
       or (d.embedding_status = 'processing' and d.processing_started_at < now() - make_interval(mins => p_stale_after_minutes))
    order by d.next_attempt_at asc, d.created_at asc
    limit p_batch_size
    for update skip locked)
  update public.documents d
  set embedding_status = 'processing', processing_started_at = now(), ingestion_attempts = d.ingestion_attempts + 1, embedding_error = null
  from candidates where d.id = candidates.id
  returning d.id, d.user_id, d.title, d.content, d.content_hash, d.ingestion_attempts;
$$;

-- Batched idempotent upsert keyed by content hash. p_chunks elements:
-- { chunk_index, content, heading_path, token_count, content_hash, embedding: "[...]" | null }  (null = reuse stored vector)
create or replace function public.upsert_document_chunks(p_document_id uuid, p_content_hash text, p_embedding_model text, p_chunks jsonb)
returns integer language plpgsql volatile security invoker set search_path = '' as $$
declare v_user_id uuid; v_count integer;
begin
  select d.user_id into v_user_id from public.documents d where d.id = p_document_id and d.content_hash = p_content_hash for share;
  if v_user_id is null then return -1; end if; -- content changed since the claim; trigger already re-queued it
  insert into public.document_chunks as dc
    (document_id, user_id, document_content_hash, chunk_index, content, heading_path, token_count, content_hash, embedding, embedding_model)
  select p_document_id, v_user_id, p_content_hash, (c ->> 'chunk_index')::integer, c ->> 'content', coalesce(c ->> 'heading_path', ''),
         (c ->> 'token_count')::integer, c ->> 'content_hash',
         coalesce((c ->> 'embedding')::extensions.vector,
                  (select o.embedding from public.document_chunks o
                    where o.document_id = p_document_id and o.content_hash = c ->> 'content_hash' and o.embedding_model = p_embedding_model)),
         p_embedding_model
  from jsonb_array_elements(p_chunks) as c
  on conflict (document_id, content_hash) do update
    set document_content_hash = excluded.document_content_hash, chunk_index = excluded.chunk_index, content = excluded.content,
        heading_path = excluded.heading_path, token_count = excluded.token_count, embedding = excluded.embedding, embedding_model = excluded.embedding_model;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

-- Publishes the new chunk set atomically; returns chunk count, or -1 when content changed mid-run.
create or replace function public.finalize_document_ingestion(p_document_id uuid, p_content_hash text, p_embedding_model text)
returns integer language plpgsql volatile security invoker set search_path = '' as $$
declare v_count integer;
begin
  perform 1 from public.documents d where d.id = p_document_id and d.content_hash = p_content_hash and d.embedding_status = 'processing' for update;
  if not found then return -1; end if;
  delete from public.document_chunks dc where dc.document_id = p_document_id
    and (dc.document_content_hash <> p_content_hash or dc.embedding_model <> p_embedding_model);
  select count(*) into v_count from public.document_chunks dc where dc.document_id = p_document_id;
  update public.documents d set embedding_status = 'ready', embedding_error = null, embedding_model = p_embedding_model,
    chunk_count = v_count, processing_started_at = null where d.id = p_document_id;
  return v_count;
end; $$;

-- p_retry_in_seconds null = terminal failure (users can still requeue).
create or replace function public.mark_document_ingestion_failed(p_document_id uuid, p_error text, p_retry_in_seconds integer default null)
returns void language sql volatile security invoker set search_path = '' as $$
  update public.documents d set embedding_status = 'failed', embedding_error = left(p_error, 2000), processing_started_at = null,
    next_attempt_at = case when p_retry_in_seconds is null then 'infinity'::timestamptz else now() + make_interval(secs => p_retry_in_seconds) end
  where d.id = p_document_id and d.embedding_status = 'processing';
$$;

-- Worker: re-queue ready documents embedded with a different model signature.
create or replace function public.requeue_documents_for_model(p_embedding_model text)
returns integer language plpgsql volatile security invoker set search_path = '' as $$
declare v_count integer;
begin
  update public.documents d set embedding_status = 'pending', embedding_error = null, ingestion_attempts = 0, next_attempt_at = now(), processing_started_at = null
  where d.embedding_status = 'ready' and d.embedding_model is distinct from p_embedding_model;
  get diagnostics v_count = row_count; return v_count;
end; $$;

-- User-callable: re-queue own documents (one or all). Definer because users hold no update rights on bookkeeping columns.
create or replace function public.requeue_documents(p_document_id uuid default null)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.documents d set embedding_status = 'pending', embedding_error = null, ingestion_attempts = 0, next_attempt_at = now(), processing_started_at = null
  where d.user_id = (select auth.uid()) and (p_document_id is null or d.id = p_document_id) and d.embedding_status <> 'processing';
  get diagnostics v_count = row_count; return v_count;
end; $$;

-- Boot check: the API compares this with its VECTOR_DIMENSIONS constant.
create or replace function public.embedding_column_dimensions()
returns integer language sql stable security definer set search_path = '' as $$
  select a.atttypmod from pg_catalog.pg_attribute a where a.attrelid = 'public.document_chunks'::regclass and a.attname = 'embedding';
$$;

revoke execute on function public.claim_pending_documents(integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.upsert_document_chunks(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.finalize_document_ingestion(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.mark_document_ingestion_failed(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.requeue_documents_for_model(text) from public, anon, authenticated;
grant execute on function public.claim_pending_documents(integer, integer, integer) to service_role;
grant execute on function public.upsert_document_chunks(uuid, text, text, jsonb) to service_role;
grant execute on function public.finalize_document_ingestion(uuid, text, text) to service_role;
grant execute on function public.mark_document_ingestion_failed(uuid, text, integer) to service_role;
grant execute on function public.requeue_documents_for_model(text) to service_role;
revoke execute on function public.requeue_documents(uuid) from public, anon;
grant execute on function public.requeue_documents(uuid) to authenticated, service_role;
revoke execute on function public.embedding_column_dimensions() from public, anon;
grant execute on function public.embedding_column_dimensions() to authenticated, service_role;
