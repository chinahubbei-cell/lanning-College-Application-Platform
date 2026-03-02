-- National data expansion migration (non-breaking)
-- Date: 2026-03-02

create extension if not exists pgcrypto;

create table if not exists university_master (
  university_uid uuid primary key default gen_random_uuid(),
  legacy_university_id bigint,
  minedu_code text,
  name text not null,
  aliases jsonb default '[]'::jsonb,
  province text not null,
  city text,
  school_type text,
  ownership_type text,
  level_tags jsonb default '[]'::jsonb,
  website text,
  source_refs jsonb default '[]'::jsonb,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists ux_university_master_minedu_code on university_master(minedu_code) where minedu_code is not null;
create index if not exists idx_university_master_name on university_master(name);
create index if not exists idx_university_master_province on university_master(province);

create table if not exists major_master (
  major_uid uuid primary key default gen_random_uuid(),
  legacy_major_id bigint,
  major_code text,
  major_name text not null,
  category text,
  degree_type text,
  source_refs jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_major_master_name on major_master(major_name);
create index if not exists idx_major_master_category on major_master(category);

create table if not exists university_major_offerings (
  id uuid primary key default gen_random_uuid(),
  university_uid uuid not null references university_master(university_uid),
  major_uid uuid not null references major_master(major_uid),
  province text not null,
  year int not null,
  batch text,
  subject_track text,
  selection_requirements jsonb,
  tuition numeric,
  duration_years int,
  source_refs jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists ux_uni_major_offerings_key
on university_major_offerings(university_uid, major_uid, province, year, coalesce(batch,''), coalesce(subject_track,''));

create table if not exists admission_records (
  id uuid primary key default gen_random_uuid(),
  university_uid uuid not null references university_master(university_uid),
  major_uid uuid references major_master(major_uid),
  province text not null,
  year int not null,
  batch text not null,
  subject_track text not null,
  min_score int,
  avg_score int,
  min_rank int,
  max_rank int,
  plan_count int,
  admit_count int,
  source_priority int default 1,
  source_refs jsonb not null default '[]'::jsonb,
  quality_flag text default 'pass',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists ux_admission_records_key
on admission_records(university_uid, coalesce(major_uid::text,''), province, year, batch, subject_track);

create index if not exists idx_admission_records_query
on admission_records(province, year, subject_track, batch);

create table if not exists enrollment_plans (
  id uuid primary key default gen_random_uuid(),
  university_uid uuid not null references university_master(university_uid),
  major_uid uuid references major_master(major_uid),
  province text not null,
  year int not null,
  batch text,
  subject_track text,
  plan_count int,
  constraints jsonb,
  source_refs jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists score_rank_tables (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  year int not null,
  subject_track text not null,
  score int not null,
  rank int not null,
  cumulative_count int,
  source_refs jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  unique(province, year, subject_track, score)
);

create table if not exists data_sources (
  source_id text primary key,
  source_name text not null,
  source_type text not null,
  base_url text,
  priority int default 9,
  active boolean default true,
  license_note text,
  created_at timestamptz default now()
);

create table if not exists ingestion_runs (
  run_id uuid primary key default gen_random_uuid(),
  source_id text references data_sources(source_id),
  province text,
  task_type text not null,
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text default 'running',
  records_fetched int default 0,
  records_accepted int default 0,
  records_rejected int default 0,
  parser_version text,
  error_summary text
);

create table if not exists data_conflicts (
  conflict_id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_key text not null,
  left_source text,
  right_source text,
  left_value jsonb,
  right_value jsonb,
  severity text default 'medium',
  status text default 'open',
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Seed sources
insert into data_sources(source_id, source_name, source_type, priority, active)
values
('minedu_list', '教育部高校名单', 'ministry', 1, true),
('provincial_exam', '各省教育考试院', 'provincial', 1, true),
('sunshine_gaokao', '阳光高考', 'public', 2, true),
('school_admission_site', '高校本科招生网', 'school', 2, true)
on conflict (source_id) do nothing;
