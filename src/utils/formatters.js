/**
 * 格式化分数显示
 */
export function formatScore(score) {
    if (score == null) return '—';
    return score.toLocaleString();
}

/**
 * 格式化位次显示
 */
export function formatRank(rank) {
    if (rank == null) return '—';
    return rank.toLocaleString();
}

/**
 * 格式化日期
 */
export function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return formatDate(dateStr);
}

/**
 * 格式化大数字（如：12345 → 1.2万）
 */
export function formatLargeNumber(num) {
    if (num == null) return '—';
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
}

/**
 * 截断文本
 */
export function truncateText(text, maxLen = 100) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
}
