// Batch fetch scores from gaokao.cn STATIC CDN (verified working)
// Endpoint: https://static-data.gaokao.cn/www/2.0/school/{GK_ID}/benchmarkScore.json
const fs = require('fs');
const https = require('https');

const DELAY = 200;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
    return new Promise((resolve) => {
        https.get(url, { timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
            });
        }).on('error', () => resolve(null)).on('timeout', function () { this.destroy(); resolve(null); });
    });
}

// Province ID to name mapping
const PROV_ID_TO_NAME = {
    '11': '北京', '12': '天津', '13': '河北', '14': '山西', '15': '内蒙古',
    '21': '辽宁', '22': '吉林', '23': '黑龙江', '31': '上海', '32': '江苏',
    '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
    '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西',
    '46': '海南', '50': '重庆', '51': '四川', '52': '贵州', '53': '云南',
    '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏', '65': '新疆',
};

// Subject type mapping
// 1 = 理科, 2 = 文科, 3 = 综合改革, 2073 = 物理类, 2074 = 历史类
function mapSubjectType(typeId) {
    const t = String(typeId);
    if (t === '1' || t === '2073') return 'physics';
    if (t === '2' || t === '2074') return 'history';
    if (t === '3') return 'physics'; // 综合改革 → 归到物理类
    return 'physics';
}

async function main() {
    console.log('Step 1: 下载高校 ID 映射 (list_v2.json)...');
    const listData = await fetchJSON('https://static-data.gaokao.cn/www/2.0/school/list_v2.json');
    if (!listData || listData.code !== '0000') {
        console.error('Failed to fetch school list');
        return;
    }

    // Build gaokao_id -> {name, province, ...} mapping
    const gkSchools = listData.data;
    const gkIdToName = {};
    for (const [gkId, info] of Object.entries(gkSchools)) {
        gkIdToName[gkId] = info.name;
    }
    console.log(`  已获取 ${Object.keys(gkIdToName).length} 所高校的 gaokao ID`);

    // Read our DB universities
    const uniFile = '/Users/tianxingjian/.gemini/antigravity/brain/d1319ea6-bd0b-4ca7-a5da-4cda26a61b25/.system_generated/steps/834/output.txt';
    const content = fs.readFileSync(uniFile, 'utf8');
    let unis = [];
    try {
        let rawStr = content;
        if (rawStr.startsWith('"')) rawStr = JSON.parse(rawStr);
        const start = rawStr.indexOf('[');
        const end = rawStr.lastIndexOf(']') + 1;
        unis = JSON.parse(rawStr.substring(start, end));
    } catch (e) {
        console.error('Failed to parse universities:', e.message);
        return;
    }
    console.log(`  数据库中有 ${unis.length} 所高校`);

    // Match DB universities to gaokao IDs by name
    const nameToGkId = {};
    for (const [gkId, name] of Object.entries(gkIdToName)) {
        nameToGkId[name] = gkId;
    }

    const matched = [];
    let unmatched = 0;
    for (const uni of unis) {
        const gkId = nameToGkId[uni.name];
        if (gkId) {
            matched.push({ ...uni, gkId });
        } else {
            unmatched++;
        }
    }
    console.log(`  匹配成功: ${matched.length}, 未匹配: ${unmatched}`);

    // Batch range from args
    const startIdx = parseInt(process.argv[2]) || 0;
    const endIdx = parseInt(process.argv[3]) || matched.length;
    const batch = matched.slice(startIdx, endIdx);
    console.log(`\nStep 2: 抓取分数线 [${startIdx}-${endIdx}] (${batch.length} 所)\n`);

    let allScores = [];
    let processed = 0;
    let failCount = 0;

    for (const uni of batch) {
        processed++;
        const url = `https://static-data.gaokao.cn/www/2.0/school/${uni.gkId}/benchmarkScore.json`;
        const result = await fetchJSON(url);

        if (!result || result.code !== '0000' || !result.data) {
            failCount++;
            await sleep(100);
            continue;
        }

        let uniScoreCount = 0;
        for (const [key, score] of Object.entries(result.data)) {
            // key format: "YEAR_PROVINCEID_TYPEID" e.g. "2024_42_1"
            const parts = key.split('_');
            if (parts.length < 3) continue;

            const year = parseInt(parts[0]);
            const provId = parts[1];
            const typeId = parts[2];

            if (year < 2021 || year > 2025) continue;

            const provName = PROV_ID_TO_NAME[provId];
            if (!provName) continue;

            const minScore = parseInt(score);
            if (!minScore || minScore <= 0) continue;

            allScores.push({
                university_id: uni.id,
                province: provName,
                year: year,
                subject_type: mapSubjectType(typeId),
                batch: 'batch_1',
                min_score: minScore,
                avg_score: null,
                min_rank: null,
            });
            uniScoreCount++;
        }

        if (processed % 20 === 0) {
            console.log(`  [${processed}/${batch.length}] ${uni.name}: ${uniScoreCount} scores (total: ${allScores.length})`);
        }
        await sleep(DELAY);
    }

    console.log(`\n=== 完成 ===`);
    console.log(`处理: ${processed}, 失败: ${failCount}`);
    console.log(`总分数线记录: ${allScores.length}`);

    if (allScores.length === 0) {
        console.log('No scores to save.');
        return;
    }

    // Generate SQL
    const BATCH_SIZE = 300;
    let sqlParts = [];
    for (let i = 0; i < allScores.length; i += BATCH_SIZE) {
        const chunk = allScores.slice(i, i + BATCH_SIZE);
        const values = chunk.map(s =>
            `(${s.university_id},'${s.province}',${s.year},'${s.subject_type}','${s.batch}',${s.min_score},NULL,NULL)`
        ).join(',');
        sqlParts.push(`INSERT INTO admission_scores (university_id,province,year,subject_type,batch,min_score,avg_score,min_rank) VALUES ${values} ON CONFLICT DO NOTHING;`);
    }

    const outFile = `/tmp/gk_scores_${startIdx}_${endIdx}.sql`;
    fs.writeFileSync(outFile, sqlParts.join('\n'));
    console.log(`SQL saved to ${outFile} (${sqlParts.length} statements)`);
}

main().catch(console.error);
