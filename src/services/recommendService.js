import supabase from './supabase';

/**
 * 智能推荐算法
 * 基于分数/位次匹配，按风险等级（冲/稳/保）分组
 */
export async function getRecommendations({
    score,
    province,
    subjectType = 'physics',
    year = 2025,
}) {
    if (!score || !province) throw new Error('分数和省份为必填项');

    // 获取该省份最近年份的录取分数线
    const { data: allScores, error } = await supabase
        .from('admission_scores')
        .select(`
      *,
      universities (id, name, code, province, city, level, type, is_985, is_211, is_double_first_class, description)
    `)
        .eq('province', province)
        .eq('subject_type', subjectType)
        .eq('year', year)
        .order('min_score', { ascending: false });

    if (error) throw error;
    if (!allScores || allScores.length === 0) return { reach: [], match: [], safe: [] };

    // 按风险等级分组
    const reach = [];  // 冲: 分数差 -30 ~ -5
    const match = [];  // 稳: 分数差 -5 ~ +15
    const safe = [];   // 保: 分数差 +15 ~ +50

    for (const record of allScores) {
        if (!record.min_score || !record.universities) continue;

        const diff = score - record.min_score;
        const item = {
            ...record,
            university: record.universities,
            scoreDiff: diff,
            probability: calculateProbability(diff),
        };

        if (diff >= -30 && diff < -5) {
            item.riskLevel = 'reach';
            reach.push(item);
        } else if (diff >= -5 && diff < 15) {
            item.riskLevel = 'match';
            match.push(item);
        } else if (diff >= 15 && diff <= 50) {
            item.riskLevel = 'safe';
            safe.push(item);
        }
    }

    // 按分数差排序
    reach.sort((a, b) => b.scoreDiff - a.scoreDiff);
    match.sort((a, b) => b.scoreDiff - a.scoreDiff);
    safe.sort((a, b) => a.scoreDiff - b.scoreDiff);

    return { reach, match, safe };
}

/**
 * 计算录取概率（简化模型）
 */
function calculateProbability(diff) {
    if (diff >= 30) return 99;
    if (diff >= 20) return 90;
    if (diff >= 10) return 80;
    if (diff >= 5) return 70;
    if (diff >= 0) return 55;
    if (diff >= -5) return 40;
    if (diff >= -10) return 25;
    if (diff >= -20) return 15;
    if (diff >= -30) return 8;
    return 3;
}
