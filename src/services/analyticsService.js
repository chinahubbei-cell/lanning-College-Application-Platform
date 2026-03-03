import supabase from './supabase';

/**
 * 获取院校统计数据 (via RPC)
 */
export async function getUniversityStats() {
    const { data, error } = await supabase.rpc('get_university_stats');
    if (error) {
        console.error('Error fetching university stats via RPC:', error);
        throw error;
    }
    return data;
}

/**
 * 获取分数线统计数据 (via RPC)
 */
export async function getScoreStats(province = '湖北') {
    const { data, error } = await supabase.rpc('get_score_stats', { p_province: province });
    if (error) {
        console.error('Error fetching score stats via RPC:', error);
        throw error;
    }
    return data;
}

/**
 * 获取专业统计 (via RPC)
 */
export async function getMajorStats() {
    const { data, error } = await supabase.rpc('get_major_stats');
    if (error) {
        console.error('Error fetching major stats via RPC:', error);
        throw error;
    }
    return data;
}
