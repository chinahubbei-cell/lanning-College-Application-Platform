import supabase from './supabase';

/**
 * 获取院校列表（支持搜索、筛选、分页）
 */
export async function getUniversities({
    search = '',
    province = '',
    level = '',
    type = '',
    page = 1,
    pageSize = 12,
} = {}) {
    let query = supabase
        .from('universities')
        .select('*', { count: 'exact' });

    if (search) {
        query = query.ilike('name', `%${search}%`);
    }
    if (province) {
        query = query.eq('province', province);
    }
    if (level) {
        query = query.eq('level', level);
    }
    if (type) {
        query = query.eq('type', type);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
        .order('id', { ascending: true })
        .range(from, to);

    if (error) throw error;
    return { data, count, page, pageSize, totalPages: Math.ceil(count / pageSize) };
}

/**
 * 获取院校详情
 */
export async function getUniversityById(id) {
    const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

/**
 * 获取院校的专业列表
 */
export async function getMajorsByUniversity(universityId) {
    const { data, error } = await supabase
        .from('majors')
        .select('*')
        .eq('university_id', universityId)
        .order('category');
    if (error) throw error;
    return data;
}

/**
 * 获取院校的录取分数线
 */
export async function getAdmissionScores(universityId, { province, subjectType } = {}) {
    let query = supabase
        .from('admission_scores')
        .select('*')
        .eq('university_id', universityId);

    if (province) query = query.eq('province', province);
    if (subjectType) query = query.eq('subject_type', subjectType);

    const { data, error } = await query.order('year', { ascending: true });
    if (error) throw error;
    return data;
}
