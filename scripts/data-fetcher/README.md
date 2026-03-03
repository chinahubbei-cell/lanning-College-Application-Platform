# 高考志愿数据抓取与同步工具库

这是本平台底层业务数据的高频更新套件。用来保持**高校名录**、**开设专业**及**分省录取分数线**的最新数据同步。  
当前数据源主要依赖：**掌上高考 (gaokao.cn)**、**教育部阳光高考**及公开名单。

## 目录结构

\`\`\`
scripts/data-fetcher/
├── parse_moe_excel.js       # 解析教育部官方发布的本科高校统配名录（手动更新用）
├── import_missing_unis.js   # 全量抓取并补全新增高校数据到数据库
├── import_scores_rest.js    # 用来把拉取到的分数线 SQL 文件导入 Supabase DB 的批量工具
├── import_real_majors.js    # 从 gaokao_cn 接口抓取各院校“真实开设的专业”
└── import_simulated_majors.js # 如果真实接口失效，使用教育部标准学科目录回退生成的贴近真实热度大类的替用专业
\`\`\`

## 如何执行定期数据更新？

> [!WARNING]
> 所有脚本需要读取项目根目录的 `.env` 文件，请确保包含有效 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 或 Service Role Key。部分涉及跨表关联操作的脚本执行前，**可能需要在 Supabase UI 临时关闭特定表的 RLS（行级安全策略）或调整外键关联检查**。详见对应脚本内注释说明。

### 1. 高校名录补全
在每年6月高考前夕执行一次即可。

\`\`\`bash
cd "Planning College Application Platform"
node scripts/data-fetcher/import_missing_unis.js
\`\`\`

### 2. 院校专业调整
若院校有撤销/新增备案专业，可执行如下命令重新拉取该院校今年开设专业。
若需要全量重做，请考虑外键依赖关系。

\`\`\`bash
node scripts/data-fetcher/import_real_majors.js [startIdx] [endIdx]
# 也可以使用 fallback 方案分布
node scripts/data-fetcher/import_simulated_majors.js
\`\`\`

### 3. 分省录取分数线更新 (核心高频)
各省出分期间（6月下旬至7月）最重要。通过批量脚本下载所有新出的录取批次和最低分数线、位次数据：

\`\`\`bash
# 自动通过 gaokao_cn 的 benchmarkScore.json (绕开加密验证) 拉取最新三年内的数据
node/tmp/batch_fetch_scores_v2.js 0 750
# 将生成的 SQL 通过 Supabase REST API 大规模稳定推入数据库：
node scripts/data-fetcher/import_scores_rest.js /tmp/gk_scores_0_750.sql
\`\`\`

## 自动化方案设计 (Admin Data Sync)

目前前端已提供 **`/admin/data`** 管理台页面，能直观看到数据入库的 `data_sync_logs` 日志状况。  
如需启用面板上的「一键同步」功能，请基于 Supabase **Edge Functions** 部署以上脚本为 Webhook，让前端点击面板后调用该 Webhook，实现无需登录服务器也能更新最新高考数据的效果。
