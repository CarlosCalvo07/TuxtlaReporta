import assert from "node:assert/strict";
import { database } from "./database.mjs";
const db = await database();
let checks = 0;
const ids = {
  citizen: "20000000-0000-4000-8000-000000000001",
  other: "20000000-0000-4000-8000-000000000002",
  admin: "20000000-0000-4000-8000-000000000003",
  worker: "20000000-0000-4000-8000-000000000004",
  wrong: "20000000-0000-4000-8000-000000000005",
};
const area = "10000000-0000-4000-8000-000000000001";
async function user(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function fails(sql, params = [], code) {
  await assert.rejects(
    () => db.query(sql, params),
    code ? (e) => e.code === code : undefined,
  );
  checks++;
}
for (const [name, id] of Object.entries(ids)) {
  await db.query("insert into auth.users values($1)", [id]);
  await db.query("insert into public.profiles(id,display_name) values($1,$2)", [
    id,
    name,
  ]);
  await db.query("insert into public.user_roles(user_id,role) values($1,$2)", [
    id,
    name === "admin"
      ? "admin"
      : name === "worker" || name === "wrong"
        ? "maintenance"
        : "citizen",
  ]);
}
await db.query(
  "insert into public.maintenance_user_areas(user_id,maintenance_area_id) values($1,$2),($3,$4)",
  [ids.worker, area, ids.wrong, "10000000-0000-4000-8000-000000000002"],
);
const category = (
  await db.query("select id from public.incident_categories where slug='bache'")
).rows[0].id;
const path = `uploads/${ids.citizen}/test.jpg`;
await db.query(
  'insert into storage.objects(bucket_id,name,metadata) values(\'report-media\',$1,\'{"size":100,"mimetype":"image/jpeg"}\')',
  [path],
);
await user(ids.citizen);
const input = {
  category_id: category,
  description: "Bache profundo frente al parque central",
  latitude: 16.75,
  longitude: -93.12,
  location_source: "manual_map",
  idempotency_key: "30000000-0000-4000-8000-000000000001",
};
await fails("select public.create_report($1,$2)", [input, []]);
const report = (
  await db.query("select * from public.create_report($1,$2)", [input, [path]])
).rows[0];
checks++;
assert.match(report.folio, /^TGZ-INC-\d{8}-\d{8}$/);
checks++;
assert.equal(
  (await db.query("select * from public.create_report($1,$2)", [input, [path]]))
    .rows[0].id,
  report.id,
);
checks++;
await fails(
  "update public.reports set status='solucionado' where id=$1",
  [report.id],
  "42501",
);
await fails("update public.user_roles set role='admin'", [], "42501");
await fails(
  "select public.assign_report($1,$2,1)",
  [report.id, ids.worker],
  "42501",
);
await fails(
  "select public.change_report_status($1,'en_revision',1,'')",
  [report.id],
  "42501",
);
await fails(
  "insert into storage.objects(bucket_id,name) values('report-media','forged.jpg')",
  [],
  "42501",
);
await fails("select * from private.citizen_profiles", [], "42501");
await user(ids.other);
assert.equal((await db.query("select id from public.reports")).rows.length, 0);
checks++;
await fails("select public.create_report($1,$2)", [input, [path]]);
await user(ids.wrong);
assert.equal((await db.query("select id from public.reports")).rows.length, 0);
checks++;
await user(ids.admin);
await fails("select public.assign_report($1,$2,1)", [report.id, ids.wrong]);
await db.query("select public.assign_report($1,$2,1)", [report.id, ids.worker]);
checks++;
await fails("select public.assign_report($1,$2,1)", [report.id, ids.worker]);
await fails(
  "select public.change_report_status($1,'solucionado',2,'resuelto')",
  [report.id],
);
await db.query(
  "select public.change_report_status($1,'en_revision',2,'Revisión realizada')",
  [report.id],
);
checks++;
await user(ids.worker);
assert.equal((await db.query("select id from public.reports")).rows.length, 1);
checks++;
await fails(
  "select public.update_report($1,$2,'alta',3)",
  [report.id, category],
  "42501",
);
await db.query(
  "select public.change_report_status($1,'en_atencion',3,'Atención iniciada')",
  [report.id],
);
checks++;
await fails(
  "select public.change_report_status($1,'solucionado',4,'Trabajo concluido')",
  [report.id],
);
await fails("delete from public.report_status_history", [], "42501");
await db.exec("reset role");
const resolution = `reports/${report.id}/${ids.worker}/done.jpg`;
await db.query(
  'insert into storage.objects(bucket_id,name,metadata) values(\'report-media\',$1,\'{"size":100,"mimetype":"image/jpeg"}\')',
  [resolution],
);
await user(ids.worker);
await db.query("select public.add_media($1,$2,'resolution')", [
  report.id,
  resolution,
]);
checks++;
await db.query(
  "select public.change_report_status($1,'solucionado',5,'Trabajo concluido')",
  [report.id],
);
checks++;
await fails(
  "select public.change_report_status($1,'solucionado',4,'Trabajo concluido')",
  [report.id],
);
await user(ids.admin);
const metrics = (await db.query("select public.get_report_metrics() value"))
  .rows[0].value;
assert.equal(metrics.solucionado, 1);
checks++;
await db.query("select public.add_note($1,'Nota de uso interno','internal')", [
  report.id,
]);
await user(ids.citizen);
assert.equal(
  (await db.query("select * from public.report_notes")).rows.length,
  0,
);
checks++;
assert.equal(
  (await db.query("select * from public.report_status_history")).rows.length,
  4,
);
checks++;
await user(ids.wrong);
assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
checks++;
await db.exec("reset role");
await db.query("update public.profiles set is_active=false where id=$1", [
  ids.worker,
]);
await user(ids.worker);
assert.equal((await db.query("select * from public.reports")).rows.length, 0);
checks++;
await db.exec("reset role");
const rls = (
  await db.query(
    "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
  )
).rows;
assert.equal(rls.length, 0);
checks++;
await user(ids.admin);
assert.equal(
  (await db.query("select * from public.staff_directory")).rows.length,
  3,
);
checks++;
assert.equal(
  (
    await db.query(
      "select * from public.get_reports_in_bbox(-93.2,16.7,-93.0,16.8)",
    )
  ).rows.length,
  1,
);
checks++;
assert.equal(
  (await db.query("select * from public.get_reports_in_bbox(0,0,1,1)")).rows
    .length,
  0,
);
checks++;
assert.equal(
  (
    await db.query("select * from public.report_list where assigned_to=$1", [
      ids.worker,
    ])
  ).rows.length,
  1,
);
checks++;
await user(ids.citizen);
assert.equal(
  (await db.query("select * from public.staff_directory")).rows.length,
  0,
);
checks++;
await fails("select public.claim_push_batch()", [], "42501");
await fails("select public.claim_push_receipts()", [], "42501");
await fails(
  "select public.provision_staff($1,'Rogue','admin','{}',$2)",
  [ids.other, ids.citizen],
  "42501",
);
await user(ids.other);
assert.equal(
  (await db.query("select * from public.report_list")).rows.length,
  0,
);
checks++;
await db.exec("reset role");
await db.query(
  "insert into private.device_tokens(user_id,token) values($1,'ExponentPushToken[test]')",
  [ids.citizen],
);
await db.exec("set role service_role");
const jobs = (await db.query("select * from public.claim_push_batch()")).rows;
assert.ok(jobs.length > 0);
checks++;
const job = jobs.find((x) => x.tokens.includes("ExponentPushToken[test]"));
assert.ok(job);
checks++;
await db.query("select public.record_push_receipts($1,$2)", [
  job.id,
  [{ ticket_id: "test-ticket", token: "ExponentPushToken[test]" }],
]);
assert.equal(
  (await db.query("select * from public.claim_push_receipts()")).rows.length,
  0,
);
checks++;
await db.exec("reset role");
await db.query(
  "update private.push_receipts set available_at=now()-interval '1 second'",
);
await db.exec("set role service_role");
assert.equal(
  (await db.query("select * from public.claim_push_receipts()")).rows.length,
  1,
);
checks++;
await db.query(
  "select public.finish_push_receipt('test-ticket','DeviceNotRegistered')",
);
await db.exec("reset role");
assert.equal(
  (await db.query("select * from private.device_tokens")).rows.length,
  0,
);
checks++;
await db.exec("set role anon");
await fails("select * from public.reports", [], "42501");
await fails("select public.get_my_role()", [], "42501");
await db.exec("reset role");
await db.close();
console.log(
  `${checks} database assertions passed (PostgreSQL/PGlite + PostGIS; Auth and Storage schemas emulated).`,
);
