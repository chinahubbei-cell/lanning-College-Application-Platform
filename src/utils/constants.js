// 省份列表
export const PROVINCES = [
  { code: '11', name: '北京' },
  { code: '12', name: '天津' },
  { code: '13', name: '河北' },
  { code: '14', name: '山西' },
  { code: '15', name: '内蒙古' },
  { code: '21', name: '辽宁' },
  { code: '22', name: '吉林' },
  { code: '23', name: '黑龙江' },
  { code: '31', name: '上海' },
  { code: '32', name: '江苏' },
  { code: '33', name: '浙江' },
  { code: '34', name: '安徽' },
  { code: '35', name: '福建' },
  { code: '36', name: '江西' },
  { code: '37', name: '山东' },
  { code: '41', name: '河南' },
  { code: '42', name: '湖北' },
  { code: '43', name: '湖南' },
  { code: '44', name: '广东' },
  { code: '45', name: '广西' },
  { code: '46', name: '海南' },
  { code: '50', name: '重庆' },
  { code: '51', name: '四川' },
  { code: '52', name: '贵州' },
  { code: '53', name: '云南' },
  { code: '54', name: '西藏' },
  { code: '61', name: '陕西' },
  { code: '62', name: '甘肃' },
  { code: '63', name: '青海' },
  { code: '64', name: '宁夏' },
  { code: '65', name: '新疆' },
];

// 科类/选科类型
export const SUBJECT_TYPES = {
  TRADITIONAL: [
    { value: 'science', label: '理科' },
    { value: 'liberal_arts', label: '文科' },
  ],
  NEW_GAOKAO: [
    { value: 'physics', label: '物理类' },
    { value: 'history', label: '历史类' },
  ],
};

// 院校层次
export const UNIVERSITY_LEVELS = [
  { value: '985', label: '985', color: '#EF4444' },
  { value: '211', label: '211', color: '#F59E0B' },
  { value: 'double_first_class', label: '双一流', color: '#6366F1' },
  { value: 'regular', label: '普通本科', color: '#64748B' },
];

// 院校类型
export const UNIVERSITY_TYPES = [
  '综合', '理工', '师范', '医药', '财经',
  '政法', '语言', '农林', '艺术', '体育',
  '民族', '军事',
];

// 批次
export const BATCHES = [
  { value: 'batch_1', label: '本科一批' },
  { value: 'batch_2', label: '本科二批' },
  { value: 'early', label: '提前批' },
  { value: 'special', label: '专项计划' },
];

// 风险等级
export const RISK_LEVELS = {
  reach: { label: '冲', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  match: { label: '稳', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' },
  safe: { label: '保', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
};

// 方案状态
export const PLAN_STATUS = {
  draft: { label: '草稿', color: '#94A3B8' },
  submitted: { label: '已提交', color: '#10B981' },
  archived: { label: '已归档', color: '#64748B' },
};

// 分页默认值
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
};

// 路由路径
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RECOMMEND: '/recommend',
  UNIVERSITIES: '/universities',
  UNIVERSITY_DETAIL: '/universities/:id',
  MAJORS: '/majors',
  MAJOR_DETAIL: '/majors/:id',
  PLANS: '/plans',
  PLAN_EDITOR: '/plans/:id',
  PLAN_COMPARE: '/plans/compare',
  ANALYTICS: '/analytics',
  ASSISTANT: '/assistant',
  PROFILE: '/profile',
};
