import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { readFile, readdir } from "node:fs/promises";
export async function database() {
  const db = new PGlite({ extensions: { postgis } });
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,anon,service_role; grant execute on function auth.uid() to authenticated,anon,service_role;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
 alter table storage.objects enable row level security; grant usage on schema storage to authenticated; grant select on storage.objects to authenticated;
 create publication supabase_realtime;`);
  for (const file of (await readdir("supabase/migrations"))
    .filter((x) => x.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
  return db;
}
