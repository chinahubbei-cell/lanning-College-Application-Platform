import supabase from './supabase';

/**
 * 获取专业列表（支持搜索、筛选、分页）
 */
export async function getMajors({
    search = '',
    category = '',
    page = 1,
    pageSize = 20,
} = {}) {
    let query = supabase
        .from('majors')
        .select('*, universities(id, name, level, province)', { count: 'exact' });

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
 */
export async function getMajorCategories() {
    const { data, error } = await supabase
        .from('majors')
        .select('category')
        .order('category');
    if (error) throw error;
    // 去重
    const categories = [...new Set(data.map((d) => d.category))];
    return categories;
}
