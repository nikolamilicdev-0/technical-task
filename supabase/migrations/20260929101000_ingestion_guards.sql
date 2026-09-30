-- DEC-023: finalize publishes exactly the run's chunk set, and a failure lands only on the claim that failed.
drop function public.finalize_document_ingestion(uuid, text, text);
drop function public.mark_document_ingestion_failed(uuid, text, integer);

-- Rows of another content version, model or chunk set go (a retuned chunker hashes the same text anew).
-- Returns the chunk count, or -1 when the content changed or the run lost its claim.
create or replace function public.finalize_document_ingestion(p_document_id uuid, p_content_hash text, p_embedding_model text, p_chunk_hashes text[])
returns integer language plpgsql volatile security invoker set search_path = '' as $$
declare v_count integer;
begin
  perform 1 from public.documents d where d.id = p_document_id and d.content_hash = p_content_hash and d.embedding_status = 'processing' for update;
  if not found then return -1; end if;
  delete from public.document_chunks dc where dc.document_id = p_document_id
    and (dc.document_content_hash <> p_content_hash or dc.embedding_model <> p_embedding_model or dc.content_hash <> all (p_chunk_hashes));
  select count(*) into v_count from public.document_chunks dc where dc.document_id = p_document_id;
  update public.documents d set embedding_status = 'ready', embedding_error = null, embedding_model = p_embedding_model,
    chunk_count = v_count, processing_started_at = null where d.id = p_document_id;
  return v_count;
end; $$;

-- A run that went stale never overwrites a newer claim or content version.
-- p_retry_in_seconds null = terminal failure (users can still requeue).
create or replace function public.mark_document_ingestion_failed(p_document_id uuid, p_content_hash text, p_attempt integer, p_error text, p_retry_in_seconds integer default null)
returns void language sql volatile security invoker set search_path = '' as $$
  update public.documents d set embedding_status = 'failed', embedding_error = left(p_error, 2000), processing_started_at = null,
    next_attempt_at = case when p_retry_in_seconds is null then 'infinity'::timestamptz else now() + make_interval(secs => p_retry_in_seconds) end
  where d.id = p_document_id and d.content_hash = p_content_hash and d.ingestion_attempts = p_attempt and d.embedding_status = 'processing';
$$;

revoke execute on function public.finalize_document_ingestion(uuid, text, text, text[]) from public, anon, authenticated;
revoke execute on function public.mark_document_ingestion_failed(uuid, text, integer, text, integer) from public, anon, authenticated;
grant execute on function public.finalize_document_ingestion(uuid, text, text, text[]) to service_role;
grant execute on function public.mark_document_ingestion_failed(uuid, text, integer, text, integer) to service_role;
