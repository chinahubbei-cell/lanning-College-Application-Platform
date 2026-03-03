import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { RefreshCw, Database, Server, Clock, AlertCircle, CheckCircle, X, TimerOff, Info } from 'lucide-react';
import './DataSync.css';

const POLL_INTERVAL = 4000; // 4 seconds
const SYNC_TIMEOUT = 120000; // 2 minutes

const TASK_TYPE_LABELS = {
    UNIVERSITIES: '高校名录',
    MAJORS: '专业目录',
    SCORES: '分数线',
};

export default function DataSyncAdmin() {
    const [logs, setLogs] = useState([]);
    const [syncingTypes, setSyncingTypes] = useState(new Set()); // Track each type independently
    const [confirmModal, setConfirmModal] = useState({ open: false, type: null, title: '' });
    const [refreshing, setRefreshing] = useState(false);
    const [activeDetail, setActiveDetail] = useState(null); // { message, rect }
    const pollTimerRef = useRef(null);
    const timeoutTimersRef = useRef({});

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        const { data, error } = await supabase
            .from('data_sync_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        if (!error && data) {
            setLogs(data);
            // Check if any RUNNING logs completed → stop polling for those types
            const stillRunning = data.filter(l => l.status === 'RUNNING');
            const runningTypes = new Set(stillRunning.map(l => l.task_type));

            setSyncingTypes(prev => {
                const next = new Set();
                for (const t of prev) {
                    if (runningTypes.has(t)) next.add(t);
                }
                // If nothing is running anymore, stop polling
                if (next.size === 0 && pollTimerRef.current) {
                    clearInterval(pollTimerRef.current);
                    pollTimerRef.current = null;
                }
                return next;
            });
        }
    }, []);

    useEffect(() => {
        fetchLogs();
        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            Object.values(timeoutTimersRef.current).forEach(clearTimeout);
        };
    }, [fetchLogs]);

    // Start polling when a sync is triggered
    const startPolling = useCallback(() => {
        if (pollTimerRef.current) return; // Already polling
        pollTimerRef.current = setInterval(fetchLogs, POLL_INTERVAL);
    }, [fetchLogs]);

    // Show confirm modal
    const requestSync = (type, title) => {
        setConfirmModal({ open: true, type, title });
    };

    const cancelSync = () => {
        setConfirmModal({ open: false, type: null, title: '' });
    };

    // Fire-and-forget async sync
    const confirmAndSync = async () => {
        const type = confirmModal.type;
        setConfirmModal({ open: false, type: null, title: '' });

        // Mark this type as syncing
        setSyncingTypes(prev => new Set([...prev, type]));

        try {
            // Call Edge Function (fire-and-forget)
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ysrcdhxjbllznvekapyy.supabase.co';
            const response = await fetch(`${supabaseUrl}/functions/v1/sync-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
                },
                body: JSON.stringify({ task_type: type, executed_by: 'admin' }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${response.status}`);
            }

            // Start polling for status updates
            startPolling();
            // Immediate refresh to show the new RUNNING log
            setTimeout(fetchLogs, 800);

            // Set a timeout to mark as timed out on the client side
            timeoutTimersRef.current[type] = setTimeout(async () => {
                setSyncingTypes(prev => {
                    const next = new Set(prev);
                    next.delete(type);
                    return next;
                });
                // Fetch latest logs after timeout
                fetchLogs();
            }, SYNC_TIMEOUT);

        } catch (err) {
            console.error('Sync trigger failed:', err);
            setSyncingTypes(prev => {
                const next = new Set(prev);
                next.delete(type);
                return next;
            });
            // Still refresh logs in case the Edge Function created a RUNNING entry
            fetchLogs();
        }
    };

    const syncItems = [
        { type: 'UNIVERSITIES', title: '同步高校名录', desc: '从教育部名录增量更新，每年6月更新', icon: Server },
        { type: 'MAJORS', title: '更新专业目录', desc: '覆盖全部高校最新开设专业信息', icon: Database },
        { type: 'SCORES', title: '拉取最新分数线', desc: '从掌上高考全量增量拉取分省分数线', icon: RefreshCw },
    ];

    // Status badge helper
    const renderStatus = (status) => {
        switch (status) {
            case 'SUCCESS':
                return (
                    <span className="datasync-badge datasync-badge--success">
                        <CheckCircle /> 成功
                    </span>
                );
            case 'RUNNING':
                return (
                    <span className="datasync-badge datasync-badge--running">
                        <RefreshCw className="datasync-spin" /> 执行中
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="datasync-badge datasync-badge--fail">
                        <AlertCircle /> 失败
                    </span>
                );
            case 'TIMEOUT':
                return (
                    <span className="datasync-badge datasync-badge--timeout">
                        <TimerOff /> 超时
                    </span>
                );
            default:
                return (
                    <span className="datasync-badge datasync-badge--unknown">
                        <Info /> {status}
                    </span>
                );
        }
    };

    // Format relative time
    const formatTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // Format duration
    const formatDuration = (log) => {
        if (!log.started_at) return '';
        const start = new Date(log.started_at);
        const end = log.finished_at ? new Date(log.finished_at) : (log.status === 'RUNNING' ? new Date() : null);
        if (!end) return '';
        const diffMs = end - start;
        if (diffMs < 1000) return `${diffMs}ms`;
        if (diffMs < 60000) return `${(diffMs / 1000).toFixed(1)}s`;
        return `${(diffMs / 60000).toFixed(1)}min`;
    };

    return (
        <div className="datasync-page container">
            {/* Header */}
            <div className="datasync-header">
                <h1 className="datasync-header__title">
                    <Database /> 数据管理与同步中心
                </h1>
                <p className="datasync-header__desc">
                    管理高校名录、开设专业及历年录取分数线的底层数据源更新。
                </p>
            </div>

            {/* Sync Cards */}
            <div className="datasync-cards">
                {syncItems.map((item, idx) => {
                    const isThisSyncing = syncingTypes.has(item.type);
                    return (
                        <div key={item.type} className={`datasync-card animate-fade-in-up delay-${idx + 1}`}>
                            <div className="datasync-card__icon-wrap">
                                <item.icon />
                            </div>
                            <h3 className="datasync-card__title">{item.title}</h3>
                            <p className="datasync-card__desc">{item.desc}</p>
                            <button
                                className="datasync-btn"
                                onClick={() => requestSync(item.type, item.title)}
                                disabled={isThisSyncing}
                            >
                                {isThisSyncing ? (
                                    <>
                                        <RefreshCw className="datasync-spin" /> 同步中...
                                    </>
                                ) : '🚀 立即触发同步'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Logs Table */}
            <div className="datasync-logs">
                <div className="datasync-logs__header">
                    <h3 className="datasync-logs__title">
                        <Clock /> 近期同步日志
                    </h3>
                    <button
                        className={`datasync-logs__refresh${refreshing ? ' datasync-logs__refresh--active' : ''}`}
                        onClick={async () => {
                            setRefreshing(true);
                            await fetchLogs();
                            setTimeout(() => setRefreshing(false), 600);
                        }}
                        disabled={refreshing}
                    >
                        <RefreshCw className={refreshing ? 'datasync-spin' : ''} />
                        {refreshing ? '刷新中...' : '刷新'}
                    </button>
                </div>

                <div className="datasync-table-wrap">
                    <table className="datasync-table">
                        <thead>
                            <tr>
                                <th>时间</th>
                                <th>任务类型</th>
                                <th>状态</th>
                                <th>更新条目数</th>
                                <th>耗时</th>
                                <th>详情</th>
                                <th>执行者</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="datasync-table__empty">
                                        暂无同步日志...
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className={log.status === 'RUNNING' ? 'datasync-row--running' : ''}>
                                        <td>{formatTime(log.created_at)}</td>
                                        <td>
                                            <span className="datasync-badge datasync-badge--type">
                                                {TASK_TYPE_LABELS[log.task_type] || log.task_type}
                                            </span>
                                        </td>
                                        <td>{renderStatus(log.status)}</td>
                                        <td className="datasync-table__records">
                                            {log.status === 'SUCCESS' && log.records_added != null
                                                ? <span className="datasync-records-count">{log.records_added.toLocaleString()}</span>
                                                : log.status === 'RUNNING'
                                                    ? <span className="datasync-records-pending">计算中...</span>
                                                    : '-'}
                                        </td>
                                        <td className="datasync-table__duration">
                                            {formatDuration(log) || '-'}
                                        </td>
                                        <td className="datasync-table__message">
                                            {log.message ? (
                                                <span
                                                    className="datasync-message-text"
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setActiveDetail({ message: log.message, rect });
                                                    }}
                                                >
                                                    {log.message.length > 20 ? log.message.slice(0, 20) + '...' : log.message}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td>{log.executed_by || 'system (cron)'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Popup */}
            {activeDetail && (
                <div className="datasync-detail-backdrop" onClick={() => setActiveDetail(null)}>
                    <div
                        className="datasync-detail-popup"
                        style={{
                            top: activeDetail.rect.bottom + 8,
                            left: Math.min(activeDetail.rect.left, window.innerWidth - 420),
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="datasync-detail-popup__header">
                            <span>详情</span>
                            <button onClick={() => setActiveDetail(null)}><X size={14} /></button>
                        </div>
                        <div className="datasync-detail-popup__body">
                            {activeDetail.message}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {confirmModal.open && (
                <div className="datasync-modal-backdrop" onClick={cancelSync}>
                    <div className="datasync-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="datasync-modal__close" onClick={cancelSync}>
                            <X />
                        </button>
                        <div className="datasync-modal__icon">
                            <AlertCircle />
                        </div>
                        <h3 className="datasync-modal__title">确认执行同步</h3>
                        <p className="datasync-modal__desc">
                            确定要执行 <strong>{confirmModal.title}</strong> 增量同步吗？<br />
                            同步将在后台执行，不影响其他操作。
                        </p>
                        <div className="datasync-modal__actions">
                            <button className="datasync-modal__btn datasync-modal__btn--cancel" onClick={cancelSync}>
                                取消
                            </button>
                            <button className="datasync-modal__btn datasync-modal__btn--confirm" onClick={confirmAndSync}>
                                ✅ 确认同步
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
