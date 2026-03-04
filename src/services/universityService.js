import supabase from './supabase';

/**
 * 获取院校列表（支持搜索、筛选、分页）
 * 优化: 仅选取列表页需要的字段，不拉取 description 等大文本
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
        .select('id, name, code, province, city, level, type, is_985, is_211, is_double_first_class, logo_url, founding_year', { count: 'exact' });

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
 * 获取院校详情 — 明确指定所有需要的字段，避免 select('*') 带来的 Schema 缓存问题
 */
export async function getUniversityById(id) {
    const { data, error } = await supabase
        .from('universities')
        .select('id, name, code, province, city, level, type, is_985, is_211, is_double_first_class, description, website, logo_url, tags, master_dept, founding_year, campus_area, student_count, is_private')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

/**
 * 获取院校的专业列表
 * 优化: 仅选取列表展示需要的字段
 */
export async function getMajorsByUniversity(universityId) {
    const { data, error } = await supabase
        .from('majors')
        .select('id, name, category, degree, duration, description')
        .eq('university_id', universityId)
        .order('category');
    if (error) throw error;
    return data;
}

/**
 * 获取院校的录取分数线
 * 优化: 仅选取图表和表格展示需要的字段
 */
export async function getAdmissionScores(universityId, { province, subjectType } = {}) {
    let query = supabase
        .from('admission_scores')
        .select('id, year, province, subject_type, batch, min_score, avg_score, min_rank')
        .eq('university_id', universityId);

    if (province) query = query.eq('province', province);
    if (subjectType) query = query.eq('subject_type', subjectType);

    const { data, error } = await query.order('year', { ascending: true });
    if (error) throw error;
    return data;
}
