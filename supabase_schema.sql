-- 研修進捗管理アプリ Supabase スキーマ

create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  member_id   text not null,
  member_name text not null,
  department_id   text not null,
  department_name text not null default '',
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
create policy "allow_all_read"  on reports for select using (true);
create policy "allow_all_insert" on reports for insert with check (true);
