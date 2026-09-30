-- Postgres 17 added MAINTAIN (VACUUM, ANALYZE, REINDEX, CLUSTER, LOCK TABLE); default grants hand it to
-- authenticated on every table. Hosted projects may still run Postgres 15, where the privilege does not exist.
do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'revoke maintain on all tables in schema public from authenticated';
  end if;
end
$$;
