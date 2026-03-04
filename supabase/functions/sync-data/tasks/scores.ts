// Helper
const PROV_ID_TO_NAME: Record<string, string> = {
    '11': '北京', '12': '天津', '13': '河北', '14': '山西', '15': '内蒙古',
    '21': '辽宁', '22': '吉林', '23': '黑龙江', '31': '上海', '32': '江苏',
    '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
    '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西',
    '46': '海南', '50': '重庆', '51': '四川', '52': '贵州', '53': '云南',
    '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏', '65': '新疆',
};

function mapSubjectType(typeId: string): string {
    if (typeId === '1' || typeId === '2073' || typeId === '3') return 'physics';
    if (typeId === '2' || typeId === '2074') return 'history';
    return 'physics';
}

export async function syncScores(supabase: any) {
    console.log('Starting sync for scores...');

    // Fetch university list to get gkIds
    const response = await fetch('https://static-data.gaokao.cn/www/2.0/school/list_v2.json');
    if (!response.ok) throw new Error('Failed to fetch school list from gaokao.cn');
    const listData = await response.json();
    const gkSchools = listData.data || {};

    const gkIdToName: Record<string, string> = {};
    for (const [gkId, info] of Object.entries(gkSchools)) {
        gkIdToName[gkId] = (info as any).name;
    }

    // Fetch DB universities
    const { data: dbUnis, error: uniError } = await supabase
        .from('universities')
        .select('id, name');

    if (uniError || !dbUnis) throw uniError || new Error('No universities found in DB');

    const nameToGkId: Record<string, string> = {};
    for (const [gkId, name] of Object.entries(gkIdToName)) {
        nameToGkId[name] = gkId;
    }

    const matchedUnis = [];
    for (const uni of dbUnis) {
        const gkId = nameToGkId[uni.name];
        if (gkId) {
            matchedUnis.push({ ...uni, gkId });
        }
    }

    console.log(`Matched ${matchedUnis.length} universities. Picking a small batch for Edge Function demo...`);

    // In an Edge Function, we cannot run all 3000 universities (will timeout).
    // We'll process a batch of 10. For full sync, use an external worker or queue.
    const batch = matchedUnis.slice(0, 10);
    const allScores = [];

    for (const uni of batch) {
        const url = `https://static-data.gaokao.cn/www/2.0/school/${uni.gkId}/benchmarkScore.json`;
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const result = await res.json();

            if (result.code !== '0000' || !result.data) continue;

            for (const [key, score] of Object.entries(result.data)) {
                const parts = key.split('_');
                if (parts.length < 3) continue;

                const year = parseInt(parts[0]);
                const provId = parts[1];
                const typeId = parts[2];

                if (year < 2021 || year > 2025) continue;

                const provName = PROV_ID_TO_NAME[provId];
                if (!provName) continue;

                const minScore = parseInt(score as string);
                if (!minScore || minScore <= 0) continue;

                allScores.push({
                    university_id: uni.id,
                    province: provName,
                    year: year,
                    subject_type: mapSubjectType(typeId),
                    batch: 'batch_1',
                    min_score: minScore
                });
            }
        } catch (e) {
            console.error(`Error fetching scores for ${uni.name}:`, e);
        }
    }

    if (allScores.length === 0) {
        return { recordsAdded: 0, message: 'No new scores found in batch.' };
    }

    console.log(`Attempting to insert ${allScores.length} score records.`);

    // Note: upsert requires 'ON CONFLICT DO NOTHING' equivalent or unique constraints.
    // If we only have auto-incrementing ID and no compound unique constraint, upsert may insert duplicates.
    // Ensure `admission_scores` has a unique constraint on (university_id, province, year, subject_type, batch).

    // For safety, we use insert and ignore duplicates on error if constraint exists, or just insert.
    // Here we'll chunk inserts.
    const BATCH_SIZE = 100;
    let successCount = 0;

    for (let i = 0; i < allScores.length; i += BATCH_SIZE) {
        const chunk = allScores.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
            .from('admission_scores')
            .upsert(chunk, { onConflict: 'university_id,province,year,subject_type,batch', ignoreDuplicates: true });

        if (insertError) {
            console.warn('Chunk insert warning (ignoring if constraint error):', insertError.message);
        } else {
            successCount += chunk.length;
        }
    }

    return {
        recordsAdded: successCount,
        message: `Processed scores batch. Attempted ${allScores.length}, successful inserts/updates ${successCount}.`
    };
}
