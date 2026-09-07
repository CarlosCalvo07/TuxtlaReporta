import { database } from "./database.mjs";
import { writeFile } from "node:fs/promises";
const db = await database();
const enums = (
  await db.query(
    `select t.typname,array_agg(e.enumlabel order by e.enumsortorder) labels from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' group by t.typname`,
  )
).rows;
function type(t) {
  if (t.endsWith("[]")) return `${type(t.slice(0, -2))}[]`;
  if (enums.some((e) => e.typname === t))
    return `Database['public']['Enums']['${t}']`;
  if (
    [
      "integer",
      "bigint",
      "smallint",
      "double precision",
      "numeric",
      "real",
    ].includes(t)
  )
    return "number";
  if (t === "boolean") return "boolean";
  if (["json", "jsonb"].includes(t)) return "Json";
  if (t.startsWith("public.")) return type(t.slice(7));
  if (t === "void") return "undefined";
  if (t === "uuid" || t === "text" || t.includes("timestamp") || t === "date")
    return "string";
  return "unknown";
}
const columns = (
  await db.query(
    `select c.table_name,pc.relkind,c.column_name,c.is_nullable,c.column_default,c.udt_name,format_type(a.atttypid,a.atttypmod) type from information_schema.columns c join pg_class pc on pc.relname=c.table_name join pg_namespace n on n.oid=pc.relnamespace and n.nspname='public' join pg_attribute a on a.attrelid=pc.oid and a.attname=c.column_name where c.table_schema='public' order by c.table_name,c.ordinal_position`,
  )
).rows;
let out = `// Generated from the versioned SQL migration by pnpm db:types. Do not edit.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database = { public: { Tables: {\n`;
for (const name of [
  ...new Set(columns.filter((c) => c.relkind === "r").map((c) => c.table_name)),
]) {
  const cols = columns.filter((c) => c.table_name === name);
  out += `${name}: { Row: {${cols.map((c) => `${c.column_name}: ${type(c.type)}${c.is_nullable === "YES" ? " | null" : ""}`).join(";")}}; Insert: {${cols.map((c) => `${c.column_name}${c.is_nullable === "YES" || c.column_default ? "?" : ""}: ${type(c.type)}${c.is_nullable === "YES" ? " | null" : ""}`).join(";")}}; Update: {${cols.map((c) => `${c.column_name}?: ${type(c.type)}${c.is_nullable === "YES" ? " | null" : ""}`).join(";")}}; Relationships: [] };\n`;
}
out += "}; Views: {\n";
for (const name of [
  ...new Set(columns.filter((c) => c.relkind === "v").map((c) => c.table_name)),
]) {
  const cols = columns.filter((c) => c.table_name === name);
  out += `${name}: {Row: {${cols.map((c) => `${c.column_name}: ${type(c.type)}${c.is_nullable === "YES" ? " | null" : ""}`).join(";")}}; Relationships: []};\n`;
}
out += "}; Functions: {\n";
const funcs = (
  await db.query(
    `select p.proname,p.proargnames,p.proargmodes,p.proretset,format_type(p.prorettype,null) result, array(select format_type(x,null) from unnest(coalesce(p.proallargtypes,p.proargtypes::oid[])) x) args,p.pronargdefaults from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'`,
  )
).rows;
for (const f of funcs) {
  let args = [];
  let returns = [];
  f.args.forEach((t, i) => {
    const mode = f.proargmodes?.[i];
    if (!mode || mode === "i")
      args.push({ name: f.proargnames[i], type: type(t) });
    else returns.push(`${f.proargnames[i]}:${type(t)}`);
  });
  const result = returns.length
    ? `{${returns.join(";")}}[]`
    : columns.some((c) => c.table_name === f.result)
      ? `Database['public']['Tables']['${f.result}']['Row']${f.proretset ? "[]" : ""}`
      : type(f.result);
  out += `${f.proname}: {Args: {${args.map((a, i) => `${a.name}${i >= args.length - f.pronargdefaults ? "?" : ""}:${a.type}`).join(";")}}; Returns:${result}};\n`;
}
out +=
  "}; Enums: {" +
  enums
    .map(
      (e) => `${e.typname}:${e.labels.map((x) => JSON.stringify(x)).join("|")}`,
    )
    .join(";") +
  "}; CompositeTypes: {} } };\n";
await writeFile(
  "packages/types/src/database.types.ts",
  out.replaceAll("{}", "Record<string, never>"),
);
await db.close();
console.log("Database types generated from migration.");
