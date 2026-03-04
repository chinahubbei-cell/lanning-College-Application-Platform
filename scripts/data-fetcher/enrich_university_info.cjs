/**
 * 院校信息补全脚本 V3 — 直接 REST PATCH 写入（RLS 已开放 UPDATE）
 * 用法: node enrich_university_info.cjs [startIdx] [endIdx]
 *
 * 补全字段: website, master_dept, founding_year, campus_area, student_count
 * 数据来源: https://static-data.gaokao.cn/www/2.0/school/{gkId}/info.json
 */

'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

// ── 读取环境变量 ─────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../../.env');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
});
const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = env['VITE_SUPABASE_ANON_KEY'];
const DELAY = 300; // ms between CDN requests

// ── 工具函数 ─────────────────────────────────────────────────
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

function httpsPatch(dbId, payload) {
    return new Promise(resolve => {
        const body = JSON.stringify(payload);
        const urlObj = new URL(`${SUPABASE_URL}/rest/v1/universities?id=eq.${dbId}`);
        const opts = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
                'Content-Length': Buffer.byteLength(body),
            },
        };
        const req = https.request(opts, res => {
            res.resume();
            res.on('end', () => resolve(res.statusCode));
        });
        req.on('error', () => resolve(null));
        req.write(body);
        req.end();
    });
}

// 分页拉取数据库所有院校（绕过 REST 1000 行限制）
async function fetchAllUniversities() {
    const PAGE = 1000;
    let all = [], offset = 0;
    while (true) {
        const url = `${SUPABASE_URL}/rest/v1/universities?select=id,name,website,founding_year,campus_area,student_count,master_dept&order=id&limit=${PAGE}&offset=${offset}`;
        const page = await new Promise(resolve => {
            const req = https.get(url, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }, res => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } });
            });
            req.on('error', () => resolve([]));
        });
        all = all.concat(page);
        if (page.length < PAGE) break;
        offset += PAGE;
    }
    return all;
}

// ── 主程序 ─────────────────────────────────────────────────────
async function main() {
    // Args are now ID ranges (not array indices)
    const startId = parseInt(process.argv[2] ?? '0');
    const endId = parseInt(process.argv[3] ?? '99999');

    console.log('=== 院校信息补全 V3 (REST PATCH) ===\n');

    // 1. 拉取掌上高考院校列表（名称→gaokao ID 映射）
    console.log('Step 1: 下载掌上高考院校列表...');
    const listData = await httpsGet('https://static-data.gaokao.cn/www/2.0/school/list_v2.json');
    if (!listData || listData.code !== '0000') {
        console.error('❌ 院校列表下载失败，请稍后重试。');
        process.exit(1);
    }
    const nameToGkId = {};
    for (const [gkId, info] of Object.entries(listData.data)) {
        nameToGkId[info.name] = gkId;
        // Also index by short name (last 5+ chars) for fuzzy matching
        // e.g. '中国人民解放军国防科技大学' -> also map '国防科技大学'
        if (info.name.length > 6) {
            const shortName = info.name.slice(-6); // last 6 chars
            if (!nameToGkId[shortName]) nameToGkId[shortName] = gkId;
            const shortName8 = info.name.slice(-8);
            if (!nameToGkId[shortName8]) nameToGkId[shortName8] = gkId;
        }
    }
    console.log(`  掌上高考 ${Object.keys(listData.data).length} 所\n`);

    // 2. 拉取数据库所有院校
    console.log('Step 2: 获取数据库院校列表...');
    const dbUnis = await fetchAllUniversities();
    console.log(`  数据库 ${dbUnis.length} 所\n`);

    // 构建映射 — 按 id 范围过滤（而非数组索引）
    const batch = dbUnis
        .filter(u => u.id >= startId && u.id <= endId)
        .map(u => {
            // Try exact name, then suffix-6, then suffix-8
            const gkId = nameToGkId[u.name]
                || nameToGkId[u.name.slice(-6)]
                || nameToGkId[u.name.slice(-8)];
            return { ...u, gkId };
        })
        .filter(u => u.gkId);

    console.log(`Step 3: 补全 ID [${startId}-${endId}] 共 ${batch.length} 所匹配\n`);

    let enriched = 0, skipped = 0, failed = 0;

    for (let i = 0; i < batch.length; i++) {
        const uni = batch[i];

        // 字段齐全则跳过
        if (uni.website && uni.founding_year && uni.campus_area && uni.master_dept && uni.student_count) {
            skipped++;
            continue;
        }

        const info_url = `https://static-data.gaokao.cn/www/2.0/school/${uni.gkId}/info.json`;
        const result = await httpsGet(info_url);

        if (!result || result.code !== '0000' || !result.data) {
            failed++;
            await sleep(200);
            continue;
        }

        const d = result.data;
        const patch = {};

        if (!uni.website) { if (d.site) patch.website = d.site; }
        if (!uni.master_dept) { if (d.belong) patch.master_dept = d.belong; }
        if (!uni.founding_year) {
            const y = parseInt(d.create_date);
            if (y > 1000 && y < 2100) patch.founding_year = y;
        }
        if (!uni.campus_area) {
            const a = parseFloat(d.area);
            if (a > 0) patch.campus_area = a;
        }
        if (!uni.student_count) {
            const s = parseInt(d.num_student);
            if (s > 0) patch.student_count = s;
        }

        if (Object.keys(patch).length === 0) { skipped++; continue; }

        patch.updated_at = new Date().toISOString();
        const status = await httpsPatch(uni.id, patch);

        if (status >= 200 && status < 300) {
            enriched++;
        } else {
            console.warn(`  ⚠️  PATCH failed for ${uni.name} (id=${uni.id}) status=${status}`);
            failed++;
        }

        if ((i + 1) % 50 === 0) {
            process.stdout.write(`  [${i + 1}/${batch.length}] ✅ ${enriched} / ⏭ ${skipped} / ❌ ${failed}\n`);
        }

        await sleep(DELAY);
    }

    console.log(`\n=== 完成 ===`);
    console.log(`✅ 补全成功: ${enriched}`);
    console.log(`⏭  已跳过:  ${skipped}`);
    console.log(`❌ 失败:     ${failed}`);
}

main().catch(console.error);
