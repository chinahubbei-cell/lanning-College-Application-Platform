import supabase from './supabase';

/**
 * 获取院校统计数据
 */
export async function getUniversityStats() {
    const { data, error } = await supabase
        .from('universities')
        .select('id, level, type, province, is_985, is_211, is_double_first_class');
    if (error) throw error;

    const total = data.length;
    const by985 = data.filter((u) => u.is_985).length;
    const by211 = data.filter((u) => u.is_211).length;
    const byDoubleFirst = data.filter((u) => u.is_double_first_class).length;

    // 按类型分布
    const byType = {};
    data.forEach((u) => {
        byType[u.type] = (byType[u.type] || 0) + 1;
    });

    // 按省份分布
    const byProvince = {};
    data.forEach((u) => {
        byProvince[u.province] = (byProvince[u.province] || 0) + 1;
    });

    // 按层次分布
    const byLevel = {
        '985': by985,
        '211': by211 - by985,
        '双一流': byDoubleFirst - by211,
        '普通本科': total - byDoubleFirst,
    };

    return { total, by985, by211, byDoubleFirst, byType, byProvince, byLevel };
}

/**
 * 获取分数线统计数据
 */
export async function getScoreStats(province = '湖北') {
    const { data, error } = await supabase
        .from('admission_scores')
        .select('*, universities(name, level, type, is_985, is_211)')
        .eq('province', province)
        .order('year', { ascending: true });
    if (error) throw error;

    // 按年份分组
    const byYear = {};
    data.forEach((s) => {
        if (!byYear[s.year]) byYear[s.year] = [];
        byYear[s.year].push(s);
    });

    // 分数分布区间
    const latestYear = Math.max(...Object.keys(byYear).map(Number));
    const latestScores = byYear[latestYear] || [];
    const distribution = {
        '680+': 0, '660-679': 0, '640-659': 0,
        '620-639': 0, '600-619': 0, '<600': 0,
    };
    latestScores.forEach((s) => {
        const score = s.min_score;
        if (!score) return;
        if (score >= 680) distribution['680+']++;
        else if (score >= 660) distribution['660-679']++;
        else if (score >= 640) distribution['640-659']++;
        else if (score >= 620) distribution['620-639']++;
        else if (score >= 600) distribution['600-619']++;
        else distribution['<600']++;
    });

    // 年度趋势（平均最低分）
    const yearTrend = Object.entries(byYear).map(([year, scores]) => {
        const avg = scores.reduce((sum, s) => sum + (s.min_score || 0), 0) / scores.length;
        return { year: Number(year), avgMinScore: Math.round(avg), count: scores.length };
    });

    return { byYear, distribution, yearTrend, latestYear, totalRecords: data.length };
}

/**
 * 获取专业统计
 */
export async function getMajorStats() {
    const { data, error } = await supabase
        .from('majors')
        .select('id, category, degree, duration');
    if (error) throw error;

    const total = data.length;
    const byCategory = {};
    data.forEach((m) => {
        byCategory[m.category] = (byCategory[m.category] || 0) + 1;
    });

    const byDegree = {};
    data.forEach((m) => {
        byDegree[m.degree] = (byDegree[m.degree] || 0) + 1;
    });

    return { total, byCategory, byDegree };
}
