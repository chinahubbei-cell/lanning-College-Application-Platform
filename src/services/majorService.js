import supabase from './supabase';

/**
 * 获取专业列表（支持搜索、筛选、分页）
 * 优化: 仅选取列表需要的字段
 */
export async function getMajors({
    search = '',
    category = '',
    page = 1,
    pageSize = 20,
} = {}) {
    let query = supabase
        .from('majors')
        .select('id, name, category, degree, duration, description, universities(id, name, level, province)', { count: 'exact' });

    if (search) {
        query = query.ilike('name', `%${search}%`);
    }
    if (category) {
        query = query.eq('category', category);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
        .order('category')
        .order('name')
        .range(from, to);

    if (error) throw error;
    return { data, count, page, pageSize, totalPages: Math.ceil(count / pageSize) };
}

/**
 * 获取专业详情
 */
export async function getMajorById(id) {
    const { data, error } = await supabase
        .from('majors')
        .select('*, universities(id, name, level, province, city)')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

/**
 * 获取专业分类列表
 * 优化: 使用 DISTINCT 代替拉取全表再去重
 */
export async function getMajorCategories() {
    const { data, error } = await supabase
        .rpc('get_distinct_major_categories');

    if (error) {
        // Fallback: 如果 RPC 不存在，使用传统方式但只取 category 列
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('majors')
            .select('category')
            .order('category');
        if (fallbackError) throw fallbackError;
        return [...new Set(fallbackData.map(d => d.category))];
    }

    return data.map(d => d.category);
}
