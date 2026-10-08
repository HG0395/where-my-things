-- Raw keys are encrypted in the Edge Function before entering this database.
create table public.byok_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  version uuid not null,
  updated_at timestamptz not null default now()
);
create table public.byok_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  attempts integer not null default 0 check (attempts >= 0),
  last_requested_at timestamptz not null,
  primary key (user_id, day)
);
create table public.byok_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  status text not null check (status in ('processing', 'succeeded', 'failed')),
  result jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (user_id, fingerprint)
);
create index byok_jobs_active on public.byok_jobs(user_id, status, expires_at);

alter table public.byok_keys enable row level security;
alter table public.byok_usage enable row level security;
alter table public.byok_jobs enable row level security;
-- No browser policies: only the authenticated Edge Function's server client uses these tables.
revoke all on public.byok_keys, public.byok_usage, public.byok_jobs from public, anon, authenticated;
grant all on public.byok_keys, public.byok_usage, public.byok_jobs to service_role;

create function public.byok_save_key(p_user_id uuid, p_ciphertext text, p_iv text, p_version uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  insert into public.byok_keys(user_id, ciphertext, iv, version)
  values(p_user_id, p_ciphertext, p_iv, p_version)
  on conflict(user_id) do update set ciphertext = excluded.ciphertext, iv = excluded.iv,
    version = excluded.version, updated_at = pg_catalog.clock_timestamp();
  delete from public.byok_jobs where user_id = p_user_id;
end $$;

create function public.byok_delete_key(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  delete from public.byok_keys where user_id = p_user_id;
  delete from public.byok_jobs where user_id = p_user_id;
  -- Keep counters so deleting/replacing a key cannot reset the daily limit.
end $$;

create function public.byok_reserve(p_user_id uuid, p_fingerprint text, p_key_version uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_day date := (v_now at time zone 'Asia/Seoul')::date;
  v_key_version uuid;
  v_job public.byok_jobs%rowtype;
  v_attempts integer;
  v_last timestamptz;
  v_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select version into v_key_version from public.byok_keys where user_id = p_user_id;
  if v_key_version is null or v_key_version <> p_key_version then
    return jsonb_build_object('status', 'missing_key');
  end if;
  if length(p_fingerprint) <> 64 or p_fingerprint !~ '^[0-9a-f]+$' then
    raise exception 'Invalid fingerprint';
  end if;
  delete from public.byok_jobs where user_id = p_user_id and expires_at < v_now - interval '1 day';
  delete from public.byok_usage where user_id = p_user_id and day < v_day - 30;
  select * into v_job from public.byok_jobs where user_id = p_user_id and fingerprint = p_fingerprint;
  if v_job.status = 'succeeded' and v_job.expires_at > v_now then
    return jsonb_build_object('status', 'cached', 'result', v_job.result);
  end if;
  if exists(select 1 from public.byok_jobs where user_id = p_user_id and status = 'processing' and expires_at > v_now) then
    return jsonb_build_object('status', 'busy', 'retryAfter', 20);
  end if;
  select attempts into v_attempts from public.byok_usage where user_id = p_user_id and day = v_day;
  if coalesce(v_attempts, 0) >= 20 then return jsonb_build_object('status', 'daily_limit'); end if;
  select max(last_requested_at) into v_last from public.byok_usage where user_id = p_user_id;
  if v_last is not null and v_last > v_now - interval '20 seconds' then
    return jsonb_build_object('status', 'cooldown', 'retryAfter', ceil(extract(epoch from v_last + interval '20 seconds' - v_now)));
  end if;
  insert into public.byok_usage(user_id, day, attempts, last_requested_at) values(p_user_id, v_day, 1, v_now)
  on conflict(user_id, day) do update set attempts = public.byok_usage.attempts + 1, last_requested_at = v_now;
  insert into public.byok_jobs(user_id, fingerprint, status, result, created_at, expires_at)
  values(p_user_id, p_fingerprint, 'processing', null, v_now, v_now + interval '90 seconds')
  on conflict(user_id, fingerprint) do update set id = gen_random_uuid(), status = 'processing', result = null,
    created_at = v_now, expires_at = v_now + interval '90 seconds'
  returning id into v_id;
  return jsonb_build_object('status', 'reserved', 'jobId', v_id);
end $$;

create function public.byok_finish(p_user_id uuid, p_job_id uuid, p_result jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  update public.byok_jobs set status = case when p_result is null then 'failed' else 'succeeded' end,
    result = p_result, expires_at = pg_catalog.clock_timestamp() + case when p_result is null then interval '0 seconds' else interval '24 hours' end
  where id = p_job_id and user_id = p_user_id and status = 'processing' and expires_at > pg_catalog.clock_timestamp();
  get diagnostics v_count = row_count;
  return v_count = 1;
end $$;

revoke all on function public.byok_save_key(uuid,text,text,uuid) from public, anon, authenticated;
revoke all on function public.byok_delete_key(uuid) from public, anon, authenticated;
revoke all on function public.byok_reserve(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.byok_finish(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.byok_save_key(uuid,text,text,uuid) to service_role;
grant execute on function public.byok_delete_key(uuid) to service_role;
grant execute on function public.byok_reserve(uuid,text,uuid) to service_role;
grant execute on function public.byok_finish(uuid,uuid,jsonb) to service_role;
