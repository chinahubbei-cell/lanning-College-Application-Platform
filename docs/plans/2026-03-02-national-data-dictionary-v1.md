# 全国高校数据字典 v1

日期：2026-03-02

## 1) universities（院校主档）
- `university_uid` (string, PK): 内部唯一ID
- `minedu_code` (string, unique): 教育部院校代码
- `name` (string, required): 院校名称
- `aliases` (jsonb): 历史名/简称
- `province` (string, required)
- `city` (string)
- `ownership_type` (enum): 公办/民办/中外合作
- `level_tags` (jsonb): 985/211/双一流等
- `website` (string)
- `status` (enum): active/inactive
- `source_refs` (jsonb): 来源引用列表
- `updated_at` (timestamp)

## 2) majors（专业主档）
- `major_uid` (string, PK)
- `major_code` (string)
- `major_name` (string, required)
- `category` (string)
- `degree_type` (string): 本科/专科等
- `source_refs` (jsonb)
- `updated_at` (timestamp)

## 3) university_major_offerings（院校专业开设）
- `id` (uuid, PK)
- `university_uid` (FK)
- `major_uid` (FK)
- `year` (int)
- `province` (string)
- `subject_track` (string): 物理类/历史类/文理科等
- `selection_requirements` (jsonb): 选科要求
- `tuition` (numeric)
- `duration_years` (int)
- `source_refs` (jsonb)

## 4) admission_scores（录取结果核心表）
- `id` (uuid, PK)
- `university_uid` (FK, required)
- `major_uid` (FK, nullable)：院校级录取线可为空
- `province` (string, required)
- `year` (int, required)
- `batch` (string, required)
- `subject_track` (string, required)
- `min_score` (int)
- `avg_score` (int)
- `min_rank` (int)
- `max_rank` (int)
- `plan_count` (int)
- `admit_count` (int)
- `source_priority` (int): 1=省考试院,2=阳光高考,3=高校官网
- `source_refs` (jsonb, required)
- `quality_flag` (enum): pass/warn/review
- `updated_at` (timestamp)

联合唯一键建议：
`(university_uid, COALESCE(major_uid,'_'), province, year, batch, subject_track)`

## 5) enrollment_plans（招生计划）
- `id` (uuid, PK)
- `university_uid` (FK)
- `major_uid` (FK)
- `province` (string)
- `year` (int)
- `batch` (string)
- `subject_track` (string)
- `plan_count` (int)
- `constraints` (jsonb)
- `source_refs` (jsonb)
- `updated_at` (timestamp)

## 6) score_rank_tables（一分一段）
- `id` (uuid, PK)
- `province` (string)
- `year` (int)
- `subject_track` (string)
- `score` (int)
- `rank` (int)
- `cumulative_count` (int)
- `source_refs` (jsonb)

## 7) data_sources（来源登记）
- `source_id` (string, PK)
- `source_name` (string)
- `source_type` (enum): ministry/provincial/school/public
- `base_url` (string)
- `priority` (int)
- `license_note` (string)
- `active` (bool)

## 8) ingestion_runs（采集运行日志）
- `run_id` (uuid, PK)
- `source_id` (FK)
- `province` (string)
- `task_type` (string)
- `started_at` / `finished_at` (timestamp)
- `status` (enum): success/partial/failed
- `records_fetched` / `records_accepted` / `records_rejected` (int)
- `error_summary` (text)
- `parser_version` (string)

## 9) data_conflicts（冲突池）
- `conflict_id` (uuid, PK)
- `entity_type` (string)
- `entity_key` (string)
- `left_source` / `right_source` (string)
- `left_value` / `right_value` (jsonb)
- `severity` (enum)
- `status` (enum): open/resolved/ignored
- `resolved_by` / `resolved_at`

## 核心校验规则（最小集）
1. 分数区间：`100 <= min_score <= 750`
2. 位次必须为正整数
3. 同键记录多源冲突时，按 `source_priority` + `发布时间` 决策，低优先来源进入冲突池
4. 所有发布记录必须带 `source_refs`
