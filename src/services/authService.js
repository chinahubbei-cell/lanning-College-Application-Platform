import supabase from './supabase';

/**
 * 邮箱密码注册
 */
export async function signUp({ email, password, name }) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name },
        },
    });
    if (error) throw error;
    return data;
}

/**
 * 邮箱密码登录
 */
export async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
    return data;
}

/**
 * 退出登录
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/**
 * 获取当前用户
 */
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
}

/**
 * 获取当前 session
 */
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
}

/**
 * 获取用户资料
 */
export async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) throw error;
    return data;
}

/**
 * 更新用户资料
 */
export async function updateUserProfile(userId, updates) {
    const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * 监听认证状态变化
 */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}
