create function public.claim_push_batch() returns table(id uuid,tokens text[]) language sql security definer set search_path='' as $$
 with ready as (select o.id from private.push_outbox o where o.delivered_at is null and o.available_at<=now() and o.attempts<8 order by o.available_at for update skip locked limit 10),
 claimed as (update private.push_outbox o set attempts=attempts+1,available_at=now()+interval '5 minutes' from ready r where o.id=r.id returning o.id,o.notification_id)
 select c.id,array(select d.token from private.device_tokens d where d.user_id=n.user_id) from claimed c join public.notifications n on n.id=c.notification_id
$$;
create function public.finish_push(job uuid,success boolean,invalid_tokens text[] default '{}') returns void language plpgsql security definer set search_path='' as $$
begin
 delete from private.device_tokens where token=any(invalid_tokens);
 update private.push_outbox set delivered_at=case when success then now() else null end,last_error=case when success then null else 'PROVIDER_RETRY' end,available_at=now()+make_interval(secs=>least(3600,60*power(2,attempts)::integer)) where id=job;
end$$;
revoke all on function public.claim_push_batch(),public.finish_push(uuid,boolean,text[]) from public,anon,authenticated;
grant execute on function public.claim_push_batch(),public.finish_push(uuid,boolean,text[]) to service_role;

-- Invoker view preserves RLS and supports server-side assignment filters with pagination.
create view public.report_list with (security_invoker=true) as
 select r.*,p.display_name citizen_name,a.maintenance_user_id assigned_to,w.display_name responsible_name
 from public.reports r left join public.profiles p on p.id=r.citizen_id
 left join public.report_assignments a on a.report_id=r.id and a.ended_at is null
 left join public.profiles w on w.id=a.maintenance_user_id;
revoke all on public.report_list from anon,authenticated;
grant select on public.report_list to authenticated;
