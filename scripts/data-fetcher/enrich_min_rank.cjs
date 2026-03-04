/**
 * 位次 (min_rank) 补全脚本 — 基于省控线 + 公式估算
 * 
 * 策略:
 * 1. 遍历 DB 中所有有 min_score 但无 min_rank 的 admission_scores 记录
 * 2. 使用省控线 + 分数差 → 位次估算公式计算 min_rank
 * 
 * 用法: node enrich_min_rank.cjs [startUnivId] [endUnivId]
 */

'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

// ── 读取环境变量 ──
const envPath = path.resolve(__dirname, '../../.env');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
});
const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = env['VITE_SUPABASE_ANON_KEY'];

// ── 2023-2025 各省一批/本科批次控制线 (全覆盖) ──
const CONTROL_LINES = {
    // ═══ 2025 ═══
    '2025_physics': {
        '湖北': 506, '湖南': 501, '广东': 508, '江苏': 448, '福建': 495,
        '河北': 502, '辽宁': 480, '重庆': 492, '江西': 488, '广西': 456,
        '安徽': 490, '贵州': 433, '山西': 467, '吉林': 462, '黑龙江': 445,
        '甘肃': 440, '河南': 500, '四川': 510, '陕西': 468, '云南': 480,
        '内蒙古': 460, '青海': 340, '宁夏': 420, '新疆': 390, '西藏': 310,
    },
    '2025_history': {
        '湖北': 518, '湖南': 517, '广东': 504, '江苏': 474, '福建': 503,
        '河北': 504, '辽宁': 487, '重庆': 500, '江西': 503, '广西': 467,
        '安徽': 498, '贵州': 493, '山西': 478, '吉林': 470, '黑龙江': 436,
        '甘肃': 456, '河南': 510, '四川': 520, '陕西': 480, '云南': 500,
        '内蒙古': 455, '青海': 390, '宁夏': 480, '新疆': 420, '西藏': 340,
    },
    '2025_comprehensive': { '北京': 434, '天津': 472, '上海': 403, '浙江': 492, '山东': 443, '海南': 483 },

    // ═══ 2024 ═══
    '2024_physics': {
        '湖北': 506, '湖南': 507, '广东': 510, '河南': 514, '四川': 539,
        '陕西': 475, '河北': 507, '安徽': 489, '江西': 502, '广西': 475,
        '辽宁': 510, '黑龙江': 408, '甘肃': 459, '云南': 505, '贵州': 480,
        '内蒙古': 475, '吉林': 482, '山西': 480, '宁夏': 435, '新疆': 396,
        '江苏': 462, '福建': 518, '重庆': 468, '青海': 330, '西藏': 305,
    },
    '2024_history': {
        '湖北': 520, '湖南': 521, '广东': 510, '河南': 521, '四川': 529,
        '陕西': 488, '河北': 512, '安徽': 491, '江西': 510, '广西': 475,
        '辽宁': 510, '黑龙江': 412, '甘肃': 472, '云南': 505, '贵州': 505,
        '内蒙古': 458, '吉林': 443, '山西': 479, '宁夏': 496, '新疆': 425,
        '江苏': 478, '福建': 519, '重庆': 498, '青海': 380, '西藏': 340,
    },
    '2024_comprehensive': { '北京': 434, '天津': 472, '上海': 403, '浙江': 488, '山东': 443, '海南': 483 },

    // ═══ 2023 ═══
    '2023_physics': {
        '湖北': 525, '湖南': 482, '广东': 439, '河南': 514, '四川': 520,
        '陕西': 449, '河北': 492, '安徽': 482, '江西': 518, '广西': 475,
        '辽宁': 360, '黑龙江': 408, '甘肃': 433, '云南': 485, '贵州': 459,
        '内蒙古': 434, '吉林': 463, '山西': 480, '宁夏': 397, '新疆': 396,
        '江苏': 448, '福建': 518, '重庆': 468, '青海': 325, '西藏': 300,
    },
    '2023_history': {
        '湖北': 527, '湖南': 451, '广东': 433, '河南': 547, '四川': 527,
        '陕西': 489, '河北': 495, '安徽': 495, '江西': 533, '广西': 475,
        '辽宁': 404, '黑龙江': 430, '甘肃': 488, '云南': 530, '贵州': 477,
        '内蒙古': 468, '吉林': 485, '山西': 490, '宁夏': 488, '新疆': 458,
        '江苏': 474, '福建': 519, '重庆': 480, '青海': 375, '西藏': 335,
    },
    '2023_comprehensive': { '北京': 448, '天津': 472, '上海': 405, '浙江': 488, '山东': 443, '海南': 483 },
};

/**
 * 分数 → 位次 估算
 * 基于省控线的分数差, 使用指数衰减模型
 */
function estimateRank(province, year, subjectType, score) {
    let key = `${year}_${subjectType}`;
    let lines = CONTROL_LINES[key];
    let controlLine = lines && lines[province];

    // 回退: 综合改革省份 (山东, 北京等) DB 中可能存为 physics
    if (controlLine === undefined) {
        const compKey = `${year}_comprehensive`;
        const compLines = CONTROL_LINES[compKey];
        controlLine = compLines && compLines[province];
    }

    if (controlLine === undefined) return null;

    const scoreDiff = score - controlLine;
    if (scoreDiff < 0) return null;

    // 各省参考人数 (万人)
    const TOTAL_STUDENTS = {
        '河南': 131, '广东': 76, '山东': 80, '四川': 62, '河北': 65,
        '湖南': 51, '安徽': 50, '湖北': 46, '江西': 40, '广西': 40,
        '江苏': 44, '浙江': 36, '云南': 36, '贵州': 35, '福建': 23,
        '陕西': 32, '重庆': 20, '辽宁': 22, '吉林': 13, '黑龙江': 19,
        '山西': 34, '甘肃': 24, '内蒙古': 17, '新疆': 22, '宁夏': 7,
        '北京': 7, '天津': 7, '上海': 5, '海南': 7, '西藏': 3, '青海': 5,
    };

    const total = (TOTAL_STUDENTS[province] || 30) * 10000;
    const subjectRatio = subjectType === 'history' ? 0.35 : 0.65;
    const subjectTotal = total * subjectRatio;

    const k = Math.log(subjectTotal) / 200;
    let rank = Math.round(subjectTotal * Math.exp(-scoreDiff * k));

    if (rank < 1) rank = 1;
    if (rank > subjectTotal) rank = Math.round(subjectTotal);

    return rank;
}

// ── HTTP 工具 ──
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpsGet(url) {
    return new Promise(resolve => {
        const req = https.get(url, { timeout: 12000 }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', function () { this.destroy(); resolve(null); });
    });
}

function httpsRequest(method, urlStr, body, headers) {
    return new Promise(resolve => {
        const urlObj = new URL(urlStr);
        const opts = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
                ...headers,
            },
        };
        if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
        const req = https.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d }));
        });
        req.on('error', () => resolve({ status: 0, body: '' }));
        if (body) req.write(body);
        req.end();
    });
}

// ── 分页拉取需要更新的 admission_scores ──
async function fetchScoresToUpdate(startId, endId) {
    const PAGE = 1000;
    let all = [], offset = 0;
    while (true) {
        const url = `${SUPABASE_URL}/rest/v1/admission_scores?select=id,university_id,province,year,subject_type,batch,min_score,min_rank&min_rank=is.null&min_score=not.is.null&university_id=gte.${startId}&university_id=lte.${endId}&order=id&limit=${PAGE}&offset=${offset}`;
        const res = await httpsRequest('GET', url);
        if (res.status !== 200) { console.error('DB fetch failed:', res.status); break; }
        let page;
        try { page = JSON.parse(res.body); } catch { page = []; }
        all = all.concat(page);
        if (page.length < PAGE) break;
        offset += PAGE;
    }
    return all;
}

// ── 批量更新 min_rank ──
async function batchUpdateRanks(updates) {
    let success = 0, fail = 0;
    for (let i = 0; i < updates.length; i++) {
        const { id, min_rank } = updates[i];
        const url = `${SUPABASE_URL}/rest/v1/admission_scores?id=eq.${id}`;
        const body = JSON.stringify({ min_rank });
        const res = await httpsRequest('PATCH', url, body);
        if (res.status >= 200 && res.status < 300) {
            success++;
        } else {
            fail++;
        }

        if ((i + 1) % 500 === 0) {
            process.stdout.write(`  [${i + 1}/${updates.length}] ✅ ${success} / ❌ ${fail}\n`);
            await sleep(50);
        }
    }
    return { success, fail };
}

// ── 主程序 ──
async function main() {
    const startId = parseInt(process.argv[2] ?? '0');
    const endId = parseInt(process.argv[3] ?? '99999');

    console.log('=== 位次 (min_rank) 补全脚本 V2 ===\n');
    console.log(`大学 ID 范围: [${startId}, ${endId}]\n`);

    // Step 1: 拉取需要更新的 admission_scores
    console.log('Step 1: 获取待补全的 admission_scores (min_rank IS NULL)...');
    const scores = await fetchScoresToUpdate(startId, endId);
    console.log(`  待补全: ${scores.length} 条\n`);

    if (scores.length === 0) {
        console.log('✅ 没有需要补全的记录');
        return;
    }

    // Step 2: 使用公式估算 min_rank
    console.log('Step 2: 估算 min_rank...\n');
    const updates = [];
    let noFormula = 0;
    const missingProvinces = new Set();

    for (const score of scores) {
        const { id, province, year, subject_type, min_score } = score;
        const rank = estimateRank(province, year, subject_type, min_score);

        if (rank !== null) {
            updates.push({ id, min_rank: rank });
        } else {
            noFormula++;
            missingProvinces.add(`${province}_${year}_${subject_type}`);
        }
    }

    console.log(`  可估算: ${updates.length} 条`);
    console.log(`  无法估算: ${noFormula} 条`);
    if (missingProvinces.size > 0) {
        console.log(`  缺失省控线: ${[...missingProvinces].slice(0, 15).join(', ')}${missingProvinces.size > 15 ? '...' : ''}\n`);
    }

    if (updates.length === 0) {
        console.log('⚠️  没有可更新的记录');
        return;
    }

    // Step 3: 批量写入 DB
    console.log('\nStep 3: 批量写入 min_rank...\n');
    const { success, fail } = await batchUpdateRanks(updates);

    console.log(`\n=== 完成 ===`);
    console.log(`✅ 更新成功: ${success}`);
    console.log(`❌ 更新失败: ${fail}`);
    console.log(`⏭  无法估算: ${noFormula}`);
}

main().catch(console.error);
