create view public.staff_directory with (security_invoker=true) as
select p.*,r.role,coalesce((select array_agg(ua.maintenance_area_id order by ua.is_primary desc) from public.maintenance_user_areas ua where ua.user_id=p.id),'{}'::uuid[]) areas
from public.profiles p join public.user_roles r on r.user_id=p.id
where r.role in ('admin','maintenance') and (select private.my_role())='admin';
revoke all on public.staff_directory from public,anon,authenticated;
grant select on public.staff_directory to authenticated;

create table private.push_receipts (
 ticket_id text primary key, job_id uuid not null references private.push_outbox, token text not null,
 available_at timestamptz not null default now()+interval '15 minutes', attempts integer not null default 0,
 checked_at timestamptz, result text
);
alter table private.push_receipts enable row level security;
create index pending_push_receipts on private.push_receipts(available_at) where checked_at is null;
create function public.record_push_receipts(job uuid,receipts jsonb) returns void language sql security definer set search_path='' as $$
 insert into private.push_receipts(ticket_id,job_id,token)
 select x->>'ticket_id',job,x->>'token' from jsonb_array_elements(receipts) x
 on conflict(ticket_id) do nothing
$$;
create function public.claim_push_receipts() returns table(ticket_id text) language sql security definer set search_path='' as $$
 with ready as (select r.ticket_id from private.push_receipts r where r.checked_at is null and r.available_at<=now() and r.attempts<8 order by r.available_at for update skip locked limit 300)
 update private.push_receipts r set attempts=attempts+1,available_at=now()+interval '15 minutes' from ready x where r.ticket_id=x.ticket_id returning r.ticket_id
$$;
create function public.finish_push_receipt(ticket text,result text) returns void language plpgsql security definer set search_path='' as $$
begin
 if result not in ('delivered','DeviceNotRegistered','provider_error') then raise exception 'INVALID_RECEIPT'; end if;
 if result='DeviceNotRegistered' then delete from private.device_tokens where token=(select r.token from private.push_receipts r where r.ticket_id=ticket); end if;
 update private.push_receipts set checked_at=now(),result=finish_push_receipt.result where ticket_id=ticket;
 if result<>'delivered' then update private.push_outbox set last_error='RECEIPT_FAILED' where id=(select r.job_id from private.push_receipts r where r.ticket_id=ticket); end if;
end$$;
revoke all on function public.record_push_receipts(uuid,jsonb),public.claim_push_receipts(),public.finish_push_receipt(text,text) from public,anon,authenticated;
grant execute on function public.record_push_receipts(uuid,jsonb),public.claim_push_receipts(),public.finish_push_receipt(text,text) to service_role;
grant all on private.push_receipts to service_role;
create index rate_limit_expiration on private.rate_limits(expires_at);
