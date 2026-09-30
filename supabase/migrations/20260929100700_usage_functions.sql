create or replace function public.usage_summary(p_from timestamptz default now() - interval '30 days', p_to timestamptz default now(), p_timezone text default 'UTC')
returns jsonb language sql stable security invoker set search_path = '' as $$
  with scoped as (select * from public.usage_events u where u.user_id = (select auth.uid()) and u.created_at >= p_from and u.created_at < p_to),
  by_day as (select (created_at at time zone p_timezone)::date as day, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens,
                    sum(total_tokens) as total_tokens, count(*) as requests from scoped group by 1),
  by_model as (select provider, model, kind, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens,
                      sum(total_tokens) as total_tokens, count(*) as requests from scoped group by 1, 2, 3)
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'totals', (select jsonb_build_object('requests', count(*), 'promptTokens', coalesce(sum(prompt_tokens), 0),
                'completionTokens', coalesce(sum(completion_tokens), 0), 'totalTokens', coalesce(sum(total_tokens), 0),
                'estimatedRequests', count(*) filter (where estimated)) from scoped),
    'byDay', (select coalesce(jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'promptTokens', prompt_tokens,
                'completionTokens', completion_tokens, 'totalTokens', total_tokens, 'requests', requests) order by day), '[]'::jsonb) from by_day),
    'byModel', (select coalesce(jsonb_agg(jsonb_build_object('provider', provider, 'model', model, 'kind', kind, 'promptTokens', prompt_tokens,
                'completionTokens', completion_tokens, 'totalTokens', total_tokens, 'requests', requests) order by total_tokens desc), '[]'::jsonb) from by_model));
$$;
revoke execute on function public.usage_summary(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.usage_summary(timestamptz, timestamptz, text) to authenticated;
