# 现有结构 → 全国扩展结构迁移对照清单

日期：2026-03-02

## 目标
在不破坏现网（universities / majors / admission_scores 现有查询）的前提下，新增全国化数据结构，并提供兼容视图。

## 一、现有表
- `universities`
- `majors`
- `admission_scores`

## 二、新增表（V2）
- `university_master`：院校主档（教育部口径）
- `major_master`：专业主档
- `university_major_offerings`：院校-专业-省份-年份开设关系
- `admission_records`：标准化录取数据（支持院校级/专业级）
- `enrollment_plans`：分省招生计划
- `score_rank_tables`：一分一段
- `data_sources`：来源登记
- `ingestion_runs`：采集运行日志
- `data_conflicts`：冲突审核池

## 三、字段映射

### 1) universities -> university_master
- `universities.id` -> `university_master.legacy_university_id`
- `universities.code` -> `university_master.minedu_code`
- `universities.name` -> `university_master.name`
- `universities.province` -> `university_master.province`
- `universities.city` -> `university_master.city`
- `universities.website` -> `university_master.website`
- `universities.type` -> `university_master.school_type`
- `universities.level` + `is_985/is_211/is_double_first_class` -> `university_master.level_tags`

### 2) majors -> major_master + university_major_offerings
- `majors.id` -> `major_master.legacy_major_id`
- `majors.code` -> `major_master.major_code`
- `majors.name` -> `major_master.major_name`
- `majors.category` -> `major_master.category`
- `majors.university_id` -> `university_major_offerings.university_uid`（通过映射）

### 3) admission_scores -> admission_records
- `admission_scores.university_id` -> `admission_records.university_uid`（映射）
- `admission_scores.major_id` -> `admission_records.major_uid`（映射，允许空）
- `admission_scores.province/year/batch/subject_type/min_score/avg_score/min_rank` -> 同名标准字段

## 四、兼容策略
1. 保留现有三表不删改。
2. 新功能优先读 V2 标准表。
3. 通过兼容视图（可选）向旧接口回放 V2 数据。
4. 迁移期间双写（旧表 + 新表），稳定后逐步切换只读新表。

## 五、回滚策略
- 迁移脚本采用前向新增，不做破坏性变更。
- 若异常：停用新链路，旧链路可直接继续服务。
