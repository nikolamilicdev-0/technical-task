-- `security invoker`: RLS applies to the caller. p_user_id is passed for index selectivity; RLS still decides visibility.
create or replace function public.match_chunks(
  p_query_embedding extensions.vector(1536), p_embedding_model text, p_match_count integer default 20,
  p_min_similarity double precision default 0, p_document_ids uuid[] default null, p_user_id uuid default auth.uid())
returns table (chunk_id uuid, document_id uuid, document_title text, chunk_index integer, content text, heading_path text, similarity double precision)
language sql stable security invoker set search_path = '' as $$
  with nearest as (
    select c.id, c.document_id, c.chunk_index, c.content, c.heading_path,
           1 - (c.embedding operator(extensions.<=>) p_query_embedding) as similarity
    from public.document_chunks c
    where c.user_id = p_user_id and c.embedding_model = p_embedding_model
      and (p_document_ids is null or c.document_id = any (p_document_ids))
    order by c.embedding operator(extensions.<=>) p_query_embedding
    limit p_match_count * 2)
  select n.id, n.document_id, d.title, n.chunk_index, n.content, n.heading_path, n.similarity
  from nearest n join public.documents d on d.id = n.document_id
  where d.embedding_status = 'ready' and n.similarity >= p_min_similarity
  order by n.similarity desc limit p_match_count;
$$;

create or replace function public.search_chunks_keyword(
  p_query_text text, p_embedding_model text, p_match_count integer default 20, p_document_ids uuid[] default null, p_user_id uuid default auth.uid())
returns table (chunk_id uuid, document_id uuid, document_title text, chunk_index integer, content text, heading_path text, keyword_rank double precision)
language sql stable security invoker set search_path = '' as $$
  with matched as (
    select c.id, c.document_id, c.chunk_index, c.content, c.heading_path, ts_rank_cd(c.tsv, q.query)::double precision as keyword_rank
    from public.document_chunks c cross join websearch_to_tsquery('english', p_query_text) as q(query)
    where c.user_id = p_user_id and c.embedding_model = p_embedding_model
      and (p_document_ids is null or c.document_id = any (p_document_ids)) and c.tsv @@ q.query
    order by keyword_rank desc limit p_match_count * 2)
  select m.id, m.document_id, d.title, m.chunk_index, m.content, m.heading_path, m.keyword_rank
  from matched m join public.documents d on d.id = m.document_id
  where d.embedding_status = 'ready' order by m.keyword_rank desc limit p_match_count;
$$;

revoke execute on function public.match_chunks(extensions.vector, text, integer, double precision, uuid[], uuid) from public, anon;
grant execute on function public.match_chunks(extensions.vector, text, integer, double precision, uuid[], uuid) to authenticated, service_role;
revoke execute on function public.search_chunks_keyword(text, text, integer, uuid[], uuid) from public, anon;
grant execute on function public.search_chunks_keyword(text, text, integer, uuid[], uuid) to authenticated, service_role;
