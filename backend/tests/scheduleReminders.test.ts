// run_schedule_reminders()(확인 독촉)의 중단 조건 테스트 — 0025.
// 실제 마이그레이션 파일 전체(0001~)를 PGlite(WASM Postgres)에 그대로 적용하고 실제 함수를 호출한다.
// 함수 본문을 옮겨 적은 대체 쿼리로 검증하지 않기 위해서다.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

// Supabase가 제공하는 것들 중 마이그레이션이 참조하는 최소한만 흉내 낸다.
const SUPABASE_STUBS = `
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key, email text,
    raw_user_meta_data jsonb default '{}'::jsonb, raw_app_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
`;

async function bootDb(upTo?: string): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && (!upTo || f <= upTo))
    .sort();
  for (const f of files) {
    // gen_random_uuid는 PG13부터 내장이라 pgcrypto 없이도 동작한다. PGlite에는 pgcrypto가 없다.
    const sql = readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8').replace(/create extension if not exists pgcrypto;/g, '');
    await db.exec(sql);
  }
  return db;
}

const MASTER = '00000000-0000-0000-0000-000000000001';
const PARTNER = '00000000-0000-0000-0000-000000000002';
const WS = '00000000-0000-0000-0000-0000000000aa';

async function seedWorkspace(db: PGlite) {
  await db.exec(`
    insert into auth.users (id) values ('${MASTER}'), ('${PARTNER}');
    insert into workspace (id, name) values ('${WS}', 'test');
    insert into membership (workspace_id, user_id, role, status) values
      ('${WS}', '${MASTER}', 'master', 'active'),
      ('${WS}', '${PARTNER}', 'partner', 'active');
  `);
}

// 다음 tick에 tier 4로 올라갈 상태(등록 30시간 전, 마지막 독촉 25시간 전)의 확인 요청.
// 등록자 = master, 확인 대상 = partner.
async function addDueAck(db: PGlite, sourceType: string, sourceId: string) {
  await db.query(
    `insert into schedule_ack (source_type, source_id, workspace_id, created_by, ack_role, reminder_tier, last_reminder_at, created_at)
     values ($1, $2, $3, $4, 'partner', 3, now() - interval '25 hours', now() - interval '30 hours')`,
    [sourceType, sourceId, WS, MASTER],
  );
}

async function runReminders(db: PGlite): Promise<string[]> {
  const res = await db.query<{ source_id: string }>('select source_id from run_schedule_reminders()');
  return res.rows.map((r) => r.source_id);
}

async function insertReturningId(db: PGlite, sql: string, params: unknown[] = []): Promise<string> {
  const res = await db.query<{ id: string }>(sql, params);
  return res.rows[0].id;
}

async function addPrepItem(db: PGlite, title: string): Promise<string> {
  return insertReturningId(db, `insert into prep_item (workspace_id, title, category) values ($1, $2, '기타') returning id`, [WS, title]);
}

describe('run_schedule_reminders — 지난 일정·삭제된 일정·완료된 일정에는 독촉하지 않는다 (0025)', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await bootDb();
    await seedWorkspace(db);
  });

  it('미래 일정은 독촉하고, 지난 일정은 독촉하지 않는다', async () => {
    const future = await insertReturningId(db, `insert into love_plan (workspace_id, title, planned_at) values ($1, '미래', now() + interval '2 days') returning id`, [WS]);
    const past = await insertReturningId(db, `insert into love_plan (workspace_id, title, planned_at) values ($1, '과거', now() - interval '1 hour') returning id`, [WS]);
    await addDueAck(db, 'love_plan', future);
    await addDueAck(db, 'love_plan', past);

    expect(await runReminders(db)).toEqual([future]);
  });

  it('원본이 삭제된 확인 요청(고아 행)은 독촉하지 않는다', async () => {
    const id = await insertReturningId(db, `insert into love_plan (workspace_id, title, planned_at) values ($1, '삭제될 일정', now() + interval '2 days') returning id`, [WS]);
    await addDueAck(db, 'love_plan', id);
    await db.query('delete from love_plan where id = $1', [id]);

    expect(await runReminders(db)).toEqual([]);
  });

  it('결혼 일정: 일정 속성만 떼어낸 항목, 삭제된 항목은 독촉하지 않는다', async () => {
    const live = await addPrepItem(db, '살아있는 일정');
    const detached = await addPrepItem(db, '일정 떼어냄');
    const deleted = await addPrepItem(db, '항목 삭제');
    for (const id of [live, detached, deleted]) {
      await db.query(`insert into schedule_attr (prep_item_id, scheduled_at, event_type) values ($1, now() + interval '3 days', '상담')`, [id]);
      await addDueAck(db, 'wedding_schedule', id);
    }
    await db.query('delete from schedule_attr where prep_item_id = $1', [detached]);
    await db.query('delete from prep_item where id = $1', [deleted]);

    expect(await runReminders(db)).toEqual([live]);
  });

  it('완료된 검진·완료된 상담·완료된 체크리스트는 독촉하지 않는다', async () => {
    const checkupDone = await insertReturningId(db, `insert into checkup (workspace_id, title, hospital, scheduled_at, status) values ($1, '검진', '병원', now() + interval '1 day', 'done') returning id`, [WS]);
    const consultDone = await insertReturningId(db, `insert into consult_note (workspace_id, vendor_name, vendor_type, visit_date, status) values ($1, '업체', '기타', current_date + 5, 'done') returning id`, [WS]);
    const checklistDone = await addPrepItem(db, '끝낸 항목');
    await db.query(`insert into checklist_attr (prep_item_id, done, due_date) values ($1, true, current_date + 5)`, [checklistDone]);
    await addDueAck(db, 'pregnancy_checkup', checkupDone);
    await addDueAck(db, 'consult_note', consultDone);
    await addDueAck(db, 'checklist_due', checklistDone);

    expect(await runReminders(db)).toEqual([]);
  });

  it('날짜가 없는 상담노트·체크리스트는 독촉하지 않고, 날짜를 넣으면 그때부터 독촉한다', async () => {
    const consult = await insertReturningId(db, `insert into consult_note (workspace_id, vendor_name, vendor_type) values ($1, '업체', '기타') returning id`, [WS]);
    const checklist = await addPrepItem(db, '기한 없음');
    await db.query(`insert into checklist_attr (prep_item_id, done, due_date) values ($1, false, null)`, [checklist]);
    await addDueAck(db, 'consult_note', consult);
    await addDueAck(db, 'checklist_due', checklist);

    expect(await runReminders(db)).toEqual([]);

    await db.query('update consult_note set visit_date = current_date + 3 where id = $1', [consult]);
    await db.query('update checklist_attr set due_date = current_date + 3 where prep_item_id = $1', [checklist]);
    expect((await runReminders(db)).sort()).toEqual([consult, checklist].sort());
  });

  it('건너뛴 행은 티어와 마지막 발송 시각이 바뀌지 않는다 — 일정을 미래로 옮기면 이어서 독촉한다', async () => {
    const id = await insertReturningId(db, `insert into love_plan (workspace_id, title, planned_at) values ($1, '지난 일정', now() - interval '1 day') returning id`, [WS]);
    await addDueAck(db, 'love_plan', id);
    const before = await db.query<{ reminder_tier: number; last_reminder_at: Date }>('select reminder_tier, last_reminder_at from schedule_ack');

    expect(await runReminders(db)).toEqual([]);
    const after = await db.query<{ reminder_tier: number; last_reminder_at: Date }>('select reminder_tier, last_reminder_at from schedule_ack');
    expect(after.rows).toEqual(before.rows);

    await db.query(`update love_plan set planned_at = now() + interval '1 day' where id = $1`, [id]);
    expect(await runReminders(db)).toEqual([id]);
  });
});

describe('schedule_source_is_live — 지난 일정 경계 (KST)', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await bootDb();
    await seedWorkspace(db);
  });

  async function isLive(type: string, id: string, nowKst: string): Promise<boolean> {
    const res = await db.query<{ live: boolean }>(
      `select schedule_source_is_live($1, $2, ($3::timestamp at time zone 'Asia/Seoul')) as live`,
      [type, id, nowKst],
    );
    return res.rows[0].live;
  }

  it('시각이 있는 일정은 그 시각까지만 살아 있다', async () => {
    const id = await insertReturningId(db, `insert into love_plan (workspace_id, title, planned_at) values ($1, 't', '2026-10-10 15:00:00+09') returning id`, [WS]);
    expect(await isLive('love_plan', id, '2026-10-10 14:59:59')).toBe(true);
    expect(await isLive('love_plan', id, '2026-10-10 15:00:00')).toBe(false);
  });

  it('체크리스트 기한은 그날 23:59까지 살아 있고 다음날 00:00(KST)부터 지난 것으로 본다', async () => {
    const id = await addPrepItem(db, 'd');
    await db.query(`insert into checklist_attr (prep_item_id, done, due_date) values ($1, false, '2026-10-10')`, [id]);
    expect(await isLive('checklist_due', id, '2026-10-10 23:59:59')).toBe(true);
    expect(await isLive('checklist_due', id, '2026-10-11 00:00:00')).toBe(false);
  });

  it('시각 미입력 상담은 그날 하루 종일, 시각 입력 상담은 그 시각까지 살아 있다', async () => {
    const allDay = await insertReturningId(db, `insert into consult_note (workspace_id, vendor_name, vendor_type, visit_date) values ($1, 'a', '기타', '2026-10-10') returning id`, [WS]);
    const timed = await insertReturningId(db, `insert into consult_note (workspace_id, vendor_name, vendor_type, visit_date, visit_time) values ($1, 'b', '기타', '2026-10-10', '11:00') returning id`, [WS]);
    expect(await isLive('consult_note', allDay, '2026-10-10 23:59:59')).toBe(true);
    expect(await isLive('consult_note', allDay, '2026-10-11 00:00:00')).toBe(false);
    expect(await isLive('consult_note', timed, '2026-10-10 10:59:59')).toBe(true);
    expect(await isLive('consult_note', timed, '2026-10-10 11:00:00')).toBe(false);
  });
});

// 수정 전 상태에서 실제로 문제가 재현되는지 확인한다 — 이 테스트가 실패하면 위 테스트들이
// 아무것도 증명하지 못하는 것이므로 함께 둔다.
describe('0024까지만 적용한 상태 (수정 전)', () => {
  it('지난 일정과 삭제된 일정에도 독촉이 나간다', async () => {
    const db = await bootDb('0024_reminder_sources_functions.sql');
    await seedWorkspace(db);
    const past = await insertReturningId(db, `insert into love_plan (workspace_id, title, planned_at) values ($1, '과거', now() - interval '1 day') returning id`, [WS]);
    const orphan = '00000000-0000-0000-0000-0000000000ff';
    await addDueAck(db, 'love_plan', past);
    await addDueAck(db, 'love_plan', orphan);

    expect((await runReminders(db)).sort()).toEqual([past, orphan].sort());
  });
});
