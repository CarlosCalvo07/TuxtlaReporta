-- Fresh-install migration. Inspect the remote schema before applying to an existing project.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
grant usage on schema extensions to authenticated,service_role;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create type public.app_role as enum ('citizen','admin','maintenance');
create type public.report_status as enum ('recibido','en_revision','en_atencion','solucionado');
create type public.report_priority as enum ('baja','media','alta','urgente');
create type public.location_source as enum ('gps','manual_map');
create type public.media_type as enum ('initial','before_service','after_service','resolution');
create type public.assignment_status as enum ('asignado','aceptado','en_proceso','completado','reasignado','cancelado');

create table public.profiles (
 id uuid primary key references auth.users(id), display_name text not null check(length(display_name) between 2 and 200),
 is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
 user_id uuid primary key references public.profiles, role public.app_role not null,
 created_at timestamptz not null default now(), created_by uuid references public.profiles
);
create table private.citizen_profiles (
 user_id uuid primary key references public.profiles, first_names text not null, paternal_surname text not null,
 maternal_surname text, birth_date date not null, sex char(1) not null check(sex in ('H','M')),
 curp_hash text unique not null, curp_last4 text not null, curp_verification_status text not null default 'structural_valid'
 check(curp_verification_status in ('structural_valid','officially_verified')),
 privacy_notice_version text not null, privacy_notice_accepted_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.maintenance_areas (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100), slug text unique not null,
 description text, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.maintenance_user_areas (
 user_id uuid references public.profiles, maintenance_area_id uuid references public.maintenance_areas,
 is_primary boolean not null default false, created_by uuid references public.profiles, created_at timestamptz not null default now(),
 primary key(user_id,maintenance_area_id)
);
create unique index one_primary_area on public.maintenance_user_areas(user_id) where is_primary;
create index maintenance_area_members on public.maintenance_user_areas(maintenance_area_id,user_id);
create table public.incident_categories (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100), slug text unique not null,
 description text, icon text not null default 'pin', default_priority public.report_priority not null default 'media',
 maintenance_area_id uuid references public.maintenance_areas, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create sequence private.report_folio_seq;
create table public.reports (
 id uuid primary key default gen_random_uuid(), folio text not null unique,
 citizen_id uuid not null references public.profiles, category_id uuid not null references public.incident_categories,
 description text not null check(length(trim(description)) between 20 and 2000),
 status public.report_status not null default 'recibido', priority public.report_priority not null default 'media',
 location extensions.geography(Point,4326) not null, latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180), location_source public.location_source not null,
 location_accuracy_m numeric check(location_accuracy_m >= 0), address_text text, neighborhood text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 first_reviewed_at timestamptz, first_assigned_at timestamptz, attention_started_at timestamptz, resolved_at timestamptz,
 version integer not null default 1, idempotency_key uuid not null, unique(citizen_id,idempotency_key),
 check((status = 'solucionado') = (resolved_at is not null))
);
create index reports_location on public.reports using gist(location);
create index reports_citizen_date on public.reports(citizen_id,created_at desc);
create index reports_status_date on public.reports(status,created_at desc);
create index reports_category on public.reports(category_id);
create index reports_priority on public.reports(priority,created_at desc);
create index reports_date on public.reports(created_at desc);
create table public.report_assignments (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.reports,
 maintenance_user_id uuid not null references public.profiles, maintenance_area_id uuid not null references public.maintenance_areas,
 assigned_by uuid not null references public.profiles, status public.assignment_status not null default 'asignado',
 assignment_note text check(length(assignment_note)<=2000), assigned_at timestamptz not null default now(),
 accepted_at timestamptz, started_at timestamptz, completed_at timestamptz, ended_at timestamptz
);
create unique index one_active_assignment on public.report_assignments(report_id) where ended_at is null;
create index assignments_user on public.report_assignments(maintenance_user_id,report_id) where ended_at is null;
create table public.report_media (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.reports,
 uploaded_by uuid not null references public.profiles, media_type public.media_type not null,
 storage_bucket text not null default 'report-media' check(storage_bucket='report-media'), storage_path text not null unique,
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')), size_bytes bigint not null check(size_bytes between 1 and 8388608),
 created_at timestamptz not null default now()
);
create index media_report on public.report_media(report_id);
create table public.report_status_history (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.reports,
 from_status public.report_status, to_status public.report_status not null, changed_by uuid not null references public.profiles,
 note text check(length(note)<=2000), created_at timestamptz not null default now()
);
create index history_report on public.report_status_history(report_id,created_at);
create table public.report_notes (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.reports, author_id uuid not null references public.profiles,
 note text not null check(length(trim(note)) between 1 and 2000), visibility text not null check(visibility in ('internal','citizen_visible')),
 created_at timestamptz not null default now()
);
create index notes_report on public.report_notes(report_id);
create table public.audit_log (
 id uuid primary key default gen_random_uuid(), actor_user_id uuid references public.profiles, action text not null,
 entity_type text not null, entity_id text not null, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles, report_id uuid not null references public.reports,
 event text not null, created_at timestamptz not null default now(), read_at timestamptz
);
create index notifications_user on public.notifications(user_id,created_at desc);
create table private.device_tokens (user_id uuid references public.profiles, token text primary key, created_at timestamptz default now());
create table private.push_outbox (id uuid primary key default gen_random_uuid(), notification_id uuid references public.notifications,
 attempts integer not null default 0, available_at timestamptz not null default now(), delivered_at timestamptz, last_error text);
create table private.rate_limits (key text primary key, count integer not null default 1, expires_at timestamptz not null);

create function private.my_role() returns public.app_role language sql stable security definer set search_path='' as $$
 select r.role from public.user_roles r join public.profiles p on p.id=r.user_id where r.user_id=(select auth.uid()) and p.is_active
$$;
create function public.get_my_role() returns public.app_role language sql stable security invoker set search_path='' as $$select private.my_role()$$;
create function private.can_read_report(rid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (private.my_role()='admin' or exists (
 select 1 from public.reports r where r.id=rid and (
 (private.my_role()='citizen' and r.citizen_id=auth.uid()) or (private.my_role()='maintenance' and exists (
 select 1 from public.report_assignments a join public.maintenance_user_areas ua on ua.user_id=a.maintenance_user_id and ua.maintenance_area_id=a.maintenance_area_id
 join public.maintenance_areas ma on ma.id=ua.maintenance_area_id and ma.is_active
 where a.report_id=r.id and a.maintenance_user_id=auth.uid() and a.ended_at is null)))))
$$;
create function private.require_admin() returns void language plpgsql security invoker set search_path='' as $$
begin if private.my_role() is distinct from 'admin' then raise exception 'FORBIDDEN' using errcode='42501'; end if; end$$;
create function private.audit(action text, entity text, eid text, metadata jsonb default '{}') returns void language sql security definer set search_path='' as $$
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,metadata) values(auth.uid(),action,entity,eid,metadata)
$$;
create function private.notify(uid uuid,rid uuid,event text) returns void language plpgsql security definer set search_path='' as $$
declare nid uuid; begin
 insert into public.notifications(user_id,report_id,event) values(uid,rid,event) returning id into nid;
 insert into private.push_outbox(notification_id) values(nid);
end$$;

-- No client writes to operational tables. Mutations below check identity and business rules.
do $$declare t text; begin
 foreach t in array array['profiles','user_roles','maintenance_areas','maintenance_user_areas','incident_categories','reports','report_assignments','report_media','report_status_history','report_notes','audit_log','notifications'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end$$;
alter table private.citizen_profiles enable row level security;
alter table private.device_tokens enable row level security;
alter table private.push_outbox enable row level security;
alter table private.rate_limits enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()) or (select private.my_role())='admin');
create policy roles_read on public.user_roles for select to authenticated using (user_id=(select auth.uid()) or (select private.my_role())='admin');
create policy areas_read on public.maintenance_areas for select to authenticated using ((select private.my_role()) is not null);
create policy memberships_read on public.maintenance_user_areas for select to authenticated using (user_id=(select auth.uid()) or (select private.my_role())='admin');
create policy categories_read on public.incident_categories for select to authenticated using ((select private.my_role()) is not null and (is_active or (select private.my_role())='admin'));
create policy reports_read on public.reports for select to authenticated using (private.can_read_report(id));
create policy assignments_read on public.report_assignments for select to authenticated using ((select private.my_role())='admin' or ((select private.my_role())='maintenance' and maintenance_user_id=(select auth.uid()) and private.can_read_report(report_id)));
create policy media_read on public.report_media for select to authenticated using (private.can_read_report(report_id));
create policy history_read on public.report_status_history for select to authenticated using (private.can_read_report(report_id));
create policy notes_read on public.report_notes for select to authenticated using (private.can_read_report(report_id) and (visibility='citizen_visible' or (select private.my_role()) in ('admin','maintenance')));
create policy audit_read on public.audit_log for select to authenticated using ((select private.my_role())='admin');
create policy notifications_read on public.notifications for select to authenticated using (user_id=(select auth.uid()) and (select private.my_role()) is not null);

create function private.create_report(data jsonb, paths text[]) returns public.reports language plpgsql security definer set search_path='' as $$
declare r public.reports; cat public.incident_categories; path text; obj storage.objects; uid uuid:=auth.uid(); key uuid:=(data->>'idempotency_key')::uuid;
begin
 if private.my_role() is distinct from 'citizen' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||key::text,0));
 select * into r from public.reports where citizen_id=uid and idempotency_key=key;
 if found then return r; end if;
 if coalesce(array_length(paths,1),0) not between 1 and 5 then raise exception 'PHOTO_REQUIRED'; end if;
 select * into cat from public.incident_categories where id=(data->>'category_id')::uuid and is_active;
 if not found then raise exception 'INVALID_CATEGORY'; end if;
 insert into public.reports(folio,citizen_id,category_id,description,priority,location,latitude,longitude,location_source,location_accuracy_m,address_text,neighborhood,idempotency_key)
 values('TGZ-INC-'||to_char(now() at time zone 'America/Mexico_City','YYYYMMDD')||'-'||lpad(nextval('private.report_folio_seq')::text,8,'0'),
 uid,cat.id,trim(data->>'description'),cat.default_priority,
 extensions.st_setsrid(extensions.st_makepoint((data->>'longitude')::float8,(data->>'latitude')::float8),4326)::extensions.geography,
 (data->>'latitude')::float8,(data->>'longitude')::float8,(data->>'location_source')::public.location_source,
 (data->>'location_accuracy_m')::numeric,left(data->>'address_text',300),left(data->>'neighborhood',150),key) returning * into r;
 foreach path in array paths loop
 if path not like 'uploads/'||uid::text||'/%' then raise exception 'INVALID_MEDIA'; end if;
 select * into obj from storage.objects where bucket_id='report-media' and name=path for update;
 if not found then raise exception 'INVALID_MEDIA'; end if;
 insert into public.report_media(report_id,uploaded_by,media_type,storage_path,mime_type,size_bytes)
 values(r.id,uid,'initial',path,obj.metadata->>'mimetype',(obj.metadata->>'size')::bigint);
 end loop;
 insert into public.report_status_history(report_id,to_status,changed_by) values(r.id,'recibido',uid);
 perform private.audit('create_report','report',r.id::text);
 perform private.notify(uid,r.id,'recibido');
 return r;
end$$;
create function public.create_report(data jsonb,paths text[]) returns public.reports language sql security invoker set search_path='' as $$select private.create_report(data,paths)$$;

create function private.assign_report(rid uuid,uid uuid,expected_version integer,note text default '') returns public.reports language plpgsql security definer set search_path='' as $$
declare r public.reports; area uuid;
begin
 perform private.require_admin();
 select * into r from public.reports where id=rid for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if r.version<>expected_version then raise exception 'CONFLICT'; end if;
 if r.status not in ('recibido','en_revision','en_atencion') then raise exception 'INVALID_TRANSITION'; end if;
 select maintenance_area_id into area from public.incident_categories where id=r.category_id and is_active for share;
 perform 1 from public.profiles p join public.user_roles ur on ur.user_id=p.id join public.maintenance_user_areas ua on ua.user_id=p.id
 join public.maintenance_areas ma on ma.id=ua.maintenance_area_id
 where p.id=uid and p.is_active and ur.role='maintenance' and ua.maintenance_area_id=area and ma.is_active for share of p,ur,ua,ma;
 if not found then raise exception 'AREA_MISMATCH'; end if;
 update public.report_assignments set ended_at=now(),status='reasignado' where report_id=rid and ended_at is null;
 insert into public.report_assignments(report_id,maintenance_user_id,maintenance_area_id,assigned_by,assignment_note) values(rid,uid,area,auth.uid(),note);
 update public.reports set first_assigned_at=coalesce(first_assigned_at,now()),updated_at=now(),version=version+1 where id=rid returning * into r;
 perform private.audit('assign_report','report',rid::text,jsonb_build_object('responsible',uid,'area',area));
 perform private.notify(uid,rid,'asignado');
 return r;
end$$;
create function public.assign_report(rid uuid,uid uuid,expected_version integer,note text default '') returns public.reports language sql security invoker set search_path='' as $$select private.assign_report(rid,uid,expected_version,note)$$;

create function private.change_report_status(rid uuid,target public.report_status,expected_version integer,note text default '') returns public.reports language plpgsql security definer set search_path='' as $$
declare r public.reports; old public.report_status;
begin
 select * into r from public.reports where id=rid for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if not coalesce(private.can_read_report(rid),false) or private.my_role() not in ('admin','maintenance') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if r.version<>expected_version then raise exception 'CONFLICT'; end if;
 old:=r.status;
 if not ((old='recibido' and target='en_revision' and private.my_role()='admin') or (old='en_revision' and target='en_atencion') or (old='en_atencion' and target='solucionado')) then raise exception 'INVALID_TRANSITION'; end if;
 if target='en_atencion' and not exists(select 1 from public.report_assignments where report_id=rid and ended_at is null) then raise exception 'ASSIGNMENT_REQUIRED'; end if;
 if target='solucionado' and (length(trim(note))<5 or not exists(select 1 from public.report_media where report_id=rid and media_type='resolution')) then raise exception 'RESOLUTION_REQUIRED'; end if;
 update public.reports set status=target,updated_at=now(),version=version+1,
 first_reviewed_at=case when target='en_revision' then now() else first_reviewed_at end,
 attention_started_at=case when target='en_atencion' then now() else attention_started_at end,
 resolved_at=case when target='solucionado' then now() else null end where id=rid returning * into r;
 insert into public.report_status_history(report_id,from_status,to_status,changed_by,note) values(rid,old,target,auth.uid(),note);
 update public.report_assignments set status=case when target='solucionado' then 'completado'::public.assignment_status when target='en_atencion' then 'en_proceso'::public.assignment_status else status end,
 started_at=case when target='en_atencion' then now() else started_at end, completed_at=case when target='solucionado' then now() else completed_at end where report_id=rid and ended_at is null;
 perform private.audit('change_status','report',rid::text,jsonb_build_object('from',old,'to',target));
 perform private.notify(r.citizen_id,rid,target::text);
 return r;
end$$;
create function public.change_report_status(rid uuid,target public.report_status,expected_version integer,note text default '') returns public.reports language sql security invoker set search_path='' as $$select private.change_report_status(rid,target,expected_version,note)$$;

create function private.update_report(rid uuid,category uuid,priority public.report_priority,expected_version integer) returns void language plpgsql security definer set search_path='' as $$
declare r public.reports; area uuid;
begin
 perform private.require_admin(); select * into r from public.reports where id=rid for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if r.version<>expected_version then raise exception 'CONFLICT'; end if;
 select maintenance_area_id into area from public.incident_categories where id=category and is_active;
 if not found then raise exception 'INVALID_CATEGORY'; end if;
 if exists(select 1 from public.report_assignments a where a.report_id=rid and a.ended_at is null and a.maintenance_area_id is distinct from area) then raise exception 'AREA_MISMATCH'; end if;
 update public.reports set category_id=category,priority=update_report.priority,version=version+1,updated_at=now() where id=rid;
 perform private.audit('update_report','report',rid::text,jsonb_build_object('category',category,'priority',priority));
end$$;
create function public.update_report(rid uuid,category uuid,priority public.report_priority,expected_version integer) returns void language sql security invoker set search_path='' as $$select private.update_report(rid,category,priority,expected_version)$$;
create function private.add_note(rid uuid,note text,visibility text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(private.can_read_report(rid),false) or private.my_role() not in ('admin','maintenance') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 insert into public.report_notes(report_id,author_id,note,visibility) values(rid,auth.uid(),note,visibility);
 perform private.audit('add_note','report',rid::text);
end$$;
create function public.add_note(rid uuid,note text,visibility text) returns void language sql security invoker set search_path='' as $$select private.add_note(rid,note,visibility)$$;
create function private.add_media(rid uuid,path text,kind public.media_type) returns void language plpgsql security definer set search_path='' as $$
declare obj storage.objects;
begin
 perform 1 from public.reports where id=rid and status<>'solucionado' for update;
 if not found then raise exception 'INVALID_TRANSITION'; end if;
 if not coalesce(private.can_read_report(rid),false) or private.my_role() not in ('admin','maintenance') or kind='initial' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if path not like 'reports/'||rid::text||'/'||auth.uid()::text||'/%' then raise exception 'INVALID_MEDIA'; end if;
 if (select count(*) from public.report_media where report_id=rid and media_type<>'initial')>=10 then raise exception 'MEDIA_LIMIT'; end if;
 select * into obj from storage.objects where bucket_id='report-media' and name=path for update;
 if not found then raise exception 'INVALID_MEDIA'; end if;
 insert into public.report_media(report_id,uploaded_by,media_type,storage_path,mime_type,size_bytes) values(rid,auth.uid(),kind,path,obj.metadata->>'mimetype',(obj.metadata->>'size')::bigint);
 update public.reports set version=version+1,updated_at=now() where id=rid;
 perform private.audit('add_media','report',rid::text);
end$$;
create function public.add_media(rid uuid,path text,kind public.media_type) returns void language sql security invoker set search_path='' as $$select private.add_media(rid,path,kind)$$;

create function private.manage_catalog(kind text,data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare eid uuid:=coalesce((data->>'id')::uuid,gen_random_uuid()); oldarea uuid;
begin
 perform private.require_admin();
 if kind='area' then
 if not (data->>'is_active')::boolean and exists(select 1 from public.report_assignments a join public.reports r on r.id=a.report_id where a.maintenance_area_id=eid and a.ended_at is null and r.status<>'solucionado') then raise exception 'ACTIVE_ASSIGNMENTS'; end if;
 insert into public.maintenance_areas(id,name,slug,description,is_active) values(eid,data->>'name',data->>'slug',data->>'description',(data->>'is_active')::boolean)
 on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,is_active=excluded.is_active,updated_at=now();
 elsif kind='category' then
 select maintenance_area_id into oldarea from public.incident_categories where id=eid for update;
 if oldarea is distinct from (data->>'maintenance_area_id')::uuid and exists(select 1 from public.reports r join public.report_assignments a on a.report_id=r.id where r.category_id=eid and a.ended_at is null) then raise exception 'ACTIVE_ASSIGNMENTS'; end if;
 insert into public.incident_categories(id,name,slug,description,default_priority,maintenance_area_id,is_active)
 values(eid,data->>'name',data->>'slug',data->>'description',(data->>'default_priority')::public.report_priority,(data->>'maintenance_area_id')::uuid,(data->>'is_active')::boolean)
 on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,default_priority=excluded.default_priority,maintenance_area_id=excluded.maintenance_area_id,is_active=excluded.is_active,updated_at=now();
 else raise exception 'INVALID_CATALOG'; end if;
 perform private.audit('manage_catalog',kind,eid::text); return eid;
end$$;
create function public.manage_catalog(kind text,data jsonb) returns uuid language sql security invoker set search_path='' as $$select private.manage_catalog(kind,data)$$;
create function private.update_staff(uid uuid,active boolean,areas uuid[]) returns void language plpgsql security definer set search_path='' as $$
declare role public.app_role;
begin
 perform private.require_admin();
 select ur.role into role from public.user_roles ur where ur.user_id=uid for update;
 if role is null or role='citizen' or uid=auth.uid() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if exists(select 1 from public.report_assignments a join public.reports r on r.id=a.report_id where a.maintenance_user_id=uid and a.ended_at is null and r.status<>'solucionado' and (not active or not a.maintenance_area_id=any(areas))) then raise exception 'ACTIVE_ASSIGNMENTS'; end if;
 if role='maintenance' and active and (coalesce(array_length(areas,1),0)=0 or exists(select 1 from unnest(areas) x where not exists(select 1 from public.maintenance_areas ma where ma.id=x and ma.is_active))) then raise exception 'AREA_REQUIRED'; end if;
 update public.profiles set is_active=active,updated_at=now() where id=uid;
 if role='maintenance' then
 delete from public.maintenance_user_areas where user_id=uid;
 insert into public.maintenance_user_areas(user_id,maintenance_area_id,is_primary,created_by) select uid,x,x=areas[1],auth.uid() from unnest(areas) x;
 end if;
 perform private.audit('update_staff','profile',uid::text,jsonb_build_object('active',active,'areas',areas));
end$$;
create function public.update_staff(uid uuid,active boolean,areas uuid[]) returns void language sql security invoker set search_path='' as $$select private.update_staff(uid,active,areas)$$;

create function private.maintenance_workload(area uuid default null) returns table(user_id uuid,display_name text,area_id uuid,area_name text,open_count bigint) language plpgsql stable security definer set search_path='' as $$
begin perform private.require_admin(); return query
 select p.id,p.display_name,ma.id,ma.name,count(r.id) filter(where r.status<>'solucionado')
 from public.profiles p join public.user_roles ur on ur.user_id=p.id and ur.role='maintenance'
 join public.maintenance_user_areas ua on ua.user_id=p.id join public.maintenance_areas ma on ma.id=ua.maintenance_area_id and ma.is_active
 left join public.report_assignments a on a.maintenance_user_id=p.id and a.maintenance_area_id=ma.id and a.ended_at is null
 left join public.reports r on r.id=a.report_id where p.is_active and (area is null or ma.id=area)
 group by p.id,p.display_name,ma.id,ma.name;
end$$;
create function public.get_maintenance_workload(area uuid default null) returns table(user_id uuid,display_name text,area_id uuid,area_name text,open_count bigint) language sql security invoker set search_path='' as $$select * from private.maintenance_workload(area)$$;
create function public.get_reports_in_bbox(west float8,south float8,east float8,north float8) returns setof public.reports language sql stable security invoker set search_path='' as $$
 select r.* from public.reports r where r.location operator(extensions.&&) extensions.st_makeenvelope(west,south,east,north,4326)::extensions.geography order by r.created_at desc limit 500
$$;
create function private.report_metrics(since timestamptz,until_date timestamptz) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin perform private.require_admin();
 with filtered as (select * from public.reports where created_at>=since and created_at<until_date)
 select jsonb_build_object('total',count(*),'recibido',count(*) filter(where status='recibido'),'en_revision',count(*) filter(where status='en_revision'),
 'en_atencion',count(*) filter(where status='en_atencion'),'solucionado',count(*) filter(where status='solucionado'),
 'unassigned',count(*) filter(where not exists(select 1 from public.report_assignments a where a.report_id=filtered.id and a.ended_at is null)),
 'last24h',count(*) filter(where created_at>=now()-interval '24 hours'),'last7d',count(*) filter(where created_at>=now()-interval '7 days'),'last30d',count(*) filter(where created_at>=now()-interval '30 days'),
 'review_hours',avg(extract(epoch from first_reviewed_at-created_at)/3600),'assignment_hours',avg(extract(epoch from first_assigned_at-created_at)/3600),'review_assignment_hours',avg(extract(epoch from first_assigned_at-first_reviewed_at)/3600),
 'start_hours',avg(extract(epoch from attention_started_at-first_assigned_at)/3600),'service_hours',avg(extract(epoch from resolved_at-attention_started_at)/3600),'resolution_hours',avg(extract(epoch from resolved_at-created_at)/3600),
 'categories',(select coalesce(jsonb_agg(x),'[]') from (select c.name,count(*) total from filtered f join public.incident_categories c on c.id=f.category_id group by c.name) x),
 'priorities',(select coalesce(jsonb_agg(x),'[]') from (select priority name,count(*) total from filtered group by priority) x),
 'responsibles',(select coalesce(jsonb_agg(x),'[]') from (select p.display_name name,count(*) total from filtered f join public.report_assignments a on a.report_id=f.id and a.ended_at is null join public.profiles p on p.id=a.maintenance_user_id group by p.id,p.display_name) x),
 'zones',(select coalesce(jsonb_agg(x),'[]') from (select neighborhood name,count(*) total from filtered where neighborhood is not null group by neighborhood order by total desc limit 20) x)) into result from filtered;
 return result; end$$;
create function public.get_report_metrics(since timestamptz default '2000-01-01',until_date timestamptz default now()) returns jsonb language sql security invoker set search_path='' as $$select private.report_metrics(since,until_date)$$;

-- Only server-side Edge Functions can provision accounts and consume the rate limit.
create function public.provision_citizen(uid uuid,data jsonb,curp_hash text) returns void language plpgsql security definer set search_path='' as $$
begin
 if (data->>'birth_date')::date > (current_date-interval '17 years')::date or (data->>'birth_date')::date < (current_date-interval '121 years')::date then raise exception 'INVALID_AGE'; end if;
 insert into public.profiles(id,display_name) values(uid,concat_ws(' ',data->>'first_names',data->>'paternal_surname',nullif(data->>'maternal_surname','')));
 insert into public.user_roles(user_id,role) values(uid,'citizen');
 insert into private.citizen_profiles(user_id,first_names,paternal_surname,maternal_surname,birth_date,sex,curp_hash,curp_last4,privacy_notice_version)
 values(uid,data->>'first_names',data->>'paternal_surname',data->>'maternal_surname',(data->>'birth_date')::date,data->>'sex',curp_hash,data->>'curp_last4',data->>'privacy_notice_version');
end$$;
create function public.provision_staff(uid uuid,name text,role public.app_role,areas uuid[],actor uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles ur join public.profiles p on p.id=ur.user_id where ur.user_id=actor and ur.role='admin' and p.is_active) or role not in ('admin','maintenance') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if role='maintenance' and (coalesce(array_length(areas,1),0)=0 or exists(select 1 from unnest(areas) x where not exists(select 1 from public.maintenance_areas ma where ma.id=x and ma.is_active))) then raise exception 'AREA_REQUIRED'; end if;
 insert into public.profiles(id,display_name) values(uid,name);
 insert into public.user_roles(user_id,role,created_by) values(uid,role,actor);
 if role='maintenance' then insert into public.maintenance_user_areas(user_id,maintenance_area_id,is_primary,created_by) select uid,x,x=areas[1],actor from unnest(areas) x; end if;
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id) values(actor,'create_staff','profile',uid::text);
end$$;
create function public.consume_rate_limit(k text,max_requests integer,window_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; begin
 insert into private.rate_limits(key,count,expires_at) values(k,1,now()+make_interval(secs=>window_seconds))
 on conflict(key) do update set count=case when rate_limits.expires_at<now() then 1 else rate_limits.count+1 end,
 expires_at=case when rate_limits.expires_at<now() then now()+make_interval(secs=>window_seconds) else rate_limits.expires_at end returning count into n;
 return n<=max_requests; end$$;
create function private.register_device(token text) returns void language plpgsql security definer set search_path='' as $$
begin if private.my_role() is null or token !~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 insert into private.device_tokens(user_id,token) values(auth.uid(),token) on conflict(token) do update set user_id=excluded.user_id;
end$$;
create function public.register_device(token text) returns void language sql security invoker set search_path='' as $$select private.register_device(token)$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('report-media','report-media',false,8388608,array['image/jpeg','image/png','image/webp']);
create policy report_objects_read on storage.objects for select to authenticated using (bucket_id='report-media' and exists(select 1 from public.report_media m where m.storage_path=name and private.can_read_report(m.report_id)));
-- No direct INSERT/UPDATE/DELETE storage policies: upload-media validates actual bytes first.

do $$declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='private' and p.proname=any(array['my_role','can_read_report','require_admin','audit','notify','create_report','assign_report','change_report_status','update_report','add_note','add_media','manage_catalog','update_staff','maintenance_workload','report_metrics','register_device']))
 or (n.nspname='public' and p.proname=any(array['get_my_role','create_report','assign_report','change_report_status','update_report','add_note','add_media','manage_catalog','update_staff','get_maintenance_workload','get_reports_in_bbox','get_report_metrics','provision_citizen','provision_staff','consume_rate_limit','register_device']))
 loop execute format('revoke all on function %s from public,anon,authenticated',f.signature); end loop;
end$$;
grant execute on function private.my_role(),private.can_read_report(uuid),private.require_admin() to authenticated;
grant execute on function private.create_report(jsonb,text[]),private.assign_report(uuid,uuid,integer,text),private.change_report_status(uuid,public.report_status,integer,text),private.update_report(uuid,uuid,public.report_priority,integer),private.add_note(uuid,text,text),private.add_media(uuid,text,public.media_type),private.manage_catalog(text,jsonb),private.update_staff(uuid,boolean,uuid[]),private.maintenance_workload(uuid),private.report_metrics(timestamptz,timestamptz),private.register_device(text) to authenticated;
grant execute on function public.get_my_role(),public.create_report(jsonb,text[]),public.assign_report(uuid,uuid,integer,text),public.change_report_status(uuid,public.report_status,integer,text),public.update_report(uuid,uuid,public.report_priority,integer),public.add_note(uuid,text,text),public.add_media(uuid,text,public.media_type),public.manage_catalog(text,jsonb),public.update_staff(uuid,boolean,uuid[]),public.get_maintenance_workload(uuid),public.get_reports_in_bbox(float8,float8,float8,float8),public.get_report_metrics(timestamptz,timestamptz),public.register_device(text) to authenticated;
grant execute on function public.provision_citizen(uuid,jsonb,text),public.provision_staff(uuid,text,public.app_role,uuid[],uuid),public.consume_rate_limit(text,integer,integer) to service_role;
grant all on public.profiles,public.user_roles,public.maintenance_areas,public.maintenance_user_areas,public.incident_categories,public.reports,public.report_assignments,public.report_media,public.report_status_history,public.report_notes,public.audit_log,public.notifications,private.citizen_profiles,private.device_tokens,private.push_outbox,private.rate_limits to service_role;
grant all on sequence private.report_folio_seq to service_role;
alter publication supabase_realtime add table public.reports,public.report_assignments,public.notifications;
