-- 研修進捗管理アプリ Supabase スキーマ

create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  member_id   text not null,
  member_name text not null,
  department_id text not null,
  hours       int not null,
  units       int not null,
  content     text not null,
  submitted_at timestamptz not null default now()
);

-- インデックス
create index if not exists reports_member_id_idx on reports(member_id);
create index if not exists reports_submitted_at_idx on reports(submitted_at desc);

-- RLS（Row Level Security）を有効化
alter table reports enable row level security;

-- 誰でも読み書きできるポリシー（認証不要のシンプル構成）
create policy "allow_all_read"   on reports for select using (true);
create policy "allow_all_insert" on reports for insert with check (true);
create policy "allow_all_delete" on reports for delete using (true);

-- ──────────────────────────────────────
-- 教育プログラム進捗テーブル
-- ──────────────────────────────────────
create table if not exists education_progress (
  id            uuid primary key default gen_random_uuid(),
  member_id     text not null,
  program_no    text not null,
  completed     boolean not null default false,
  training_date date,
  trainer_name  text,
  hours         numeric,
  created_at    timestamptz not null default now(),
  unique (member_id, program_no)
);

create index if not exists education_progress_member_idx on education_progress(member_id);

alter table education_progress enable row level security;

create policy "ep_read"   on education_progress for select using (true);
create policy "ep_insert" on education_progress for insert with check (true);
create policy "ep_update" on education_progress for update using (true) with check (true);
create policy "ep_delete" on education_progress for delete using (true);

-- ──────────────────────────────────────
-- 指示書テーブルへの is_enabled 追加（既存DBで未実行の場合は要実行）
-- ALTER TABLE training_instructions ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true;
-- ──────────────────────────────────────
-- 指示書添付ファイルテーブル
-- ──────────────────────────────────────
create table if not exists instruction_files (
  id             uuid default gen_random_uuid() primary key,
  instruction_id uuid references training_instructions(id) on delete cascade,
  file_name      text not null,
  file_url       text not null,
  file_type      text,
  created_at     timestamptz default now()
);

alter table instruction_files enable row level security;

create policy "allow all" on instruction_files for all using (true) with check (true);

-- ──────────────────────────────────────
-- 報告書添付ファイルテーブル
-- ──────────────────────────────────────
create table if not exists report_files (
  id         uuid default gen_random_uuid() primary key,
  report_id  uuid references training_reports(id) on delete cascade,
  file_name  text not null,
  file_url   text not null,
  file_type  text,
  created_at timestamptz default now()
);

alter table report_files enable row level security;

create policy "allow all" on report_files for all using (true) with check (true);
