-- Run as database administrator after creating and confirming an Auth account.
-- Replace this zero UUID with that account's actual UUID before executing.
begin;
do $$
declare account uuid := '00000000-0000-0000-0000-000000000000';
begin
 if account='00000000-0000-0000-0000-000000000000' then raise exception 'Replace account with a verified Auth user UUID'; end if;
 if not exists(select 1 from auth.users where id=account and email_confirmed_at is not null) then raise exception 'Verified Auth account required'; end if;
 if exists(select 1 from public.user_roles where role='admin') then raise exception 'An administrator already exists: use the staff module'; end if;
 insert into public.profiles(id,display_name) values(account,'Administrador inicial');
 insert into public.user_roles(user_id,role) values(account,'admin');
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id) values(account,'bootstrap_admin','profile',account::text);
end $$;
commit;
