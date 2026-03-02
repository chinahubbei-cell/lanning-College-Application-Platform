import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPlanById, removePlanItem } from '../../services/planService';
import useAuthStore from '../../stores/useAuthStore';
import Card, { CardBody, CardHeader } from '../../components/common/Card';
import Tag from '../../components/common/Tag';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import { RISK_LEVELS } from '../../utils/constants';
import './Plan.css';

export default function PlanDetail() {
    const { id } = useParams();
    const { user } = useAuthStore();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchPlan();
        else setLoading(false);
    }, [user, id]);

    const fetchPlan = async () => {
        setLoading(true);
        try {
            const data = await getPlanById(id);
            setPlan(data);
        } catch (err) {
            console.error('Failed to fetch plan:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveItem = async (itemId) => {
        try {
            await removePlanItem(itemId);
            setPlan({
                ...plan,
                plan_items: plan.plan_items.filter((i) => i.id !== itemId),
            });
        } catch (err) {
            console.error('Failed to remove item:', err);
        }
    };

    if (!user) {
        return (
            <div className="plan-page container">
                <div className="uni-empty" style={{ padding: '6rem 0' }}>
                    <span className="uni-empty__icon">🔐</span>
                    <h3>请先登录</h3>
                    <Link to="/login"><Button>去登录</Button></Link>
                </div>
            </div>
        );
    }

    if (loading) return <Loading text="加载方案详情..." />;
    if (!plan) {
        return (
            <div className="uni-empty" style={{ padding: '6rem' }}>
                <span className="uni-empty__icon">😕</span>
                <h3>未找到该方案</h3>
                <Link to="/plans"><Button variant="outline">返回方案列表</Button></Link>
            </div>
        );
    }

    const riskGroups = { reach: [], match: [], safe: [], unknown: [] };
    (plan.plan_items || []).forEach((item) => {
        const key = item.risk_level || 'unknown';
        if (riskGroups[key]) riskGroups[key].push(item);
        else riskGroups.unknown.push(item);
    });

    return (
        <div className="plan-detail container animate-fade-in-up">
            <nav className="uni-detail__breadcrumb">
                <Link to="/plans">方案管理</Link>
                <span>/</span>
                <span>{plan.name}</span>
            </nav>

            {/* Hero */}
            <div className="plan-detail__hero">
                <div className="plan-detail__hero-left">
                    <h1 className="plan-detail__name">{plan.name}</h1>
                    <div className="plan-detail__meta">
                        {plan.score && <Tag variant="primary">📊 {plan.score} 分</Tag>}
                        {plan.province && <Tag variant="default">📍 {plan.province}</Tag>}
                        <Tag
                            variant={plan.status === 'submitted' ? 'success' : 'default'}
                        >
                            {plan.status === 'submitted' ? '已提交' : plan.status === 'archived' ? '已归档' : '草稿'}
                        </Tag>
                    </div>
                </div>
                <div className="plan-detail__hero-right">
                    <div className="plan-detail__stat">
                        <span className="plan-detail__stat-num">{plan.plan_items?.length || 0}</span>
                        <span className="plan-detail__stat-label">志愿数</span>
                    </div>
                </div>
            </div>

            {/* Tip */}
            <Card variant="glass" className="plan-detail__tip">
                <CardBody>
                    <p>💡 <strong>提示:</strong> 前往
                        <Link to="/recommend" className="auth-link"> 智能推荐</Link>
                        页面输入分数，可以快速发现适合的院校并添加到方案中。
                    </p>
                </CardBody>
            </Card>

            {/* Items */}
            {(plan.plan_items || []).length === 0 ? (
                <div className="plan-empty animate-fade-in" style={{ padding: '4rem 0' }}>
                    <div className="plan-empty__visual"><span>📝</span></div>
                    <h3>该方案暂无志愿条目</h3>
                    <p>通过智能推荐添加院校到此方案</p>
                    <Link to="/recommend"><Button icon="🎯">去推荐页添加</Button></Link>
                </div>
            ) : (
                <div className="plan-items-list">
                    {['reach', 'match', 'safe', 'unknown'].map((riskKey) => {
                        const items = riskGroups[riskKey];
                        if (items.length === 0) return null;
                        const config = RISK_LEVELS[riskKey] || { label: '未分类', color: '#94A3B8' };

                        return (
                            <div key={riskKey} className="plan-risk-section">
                                <h3 className="plan-risk-section__title" style={{ color: config.color }}>
                                    {riskKey === 'reach' ? '🚀 冲一冲' : riskKey === 'match' ? '🎯 稳一稳' : riskKey === 'safe' ? '🛡️ 保一保' : '📋 未分类'}
                                    <Tag>{items.length}</Tag>
                                </h3>
                                <div className="plan-items-grid">
                                    {items.map((item, i) => (
                                        <Card key={item.id} variant="glass" className="plan-item-card">
                                            <CardBody>
                                                <div className="plan-item-card__content">
                                                    <span className="plan-item-card__order">{i + 1}</span>
                                                    {item.universities ? (
                                                        <Link to={`/universities/${item.universities.id}`} className="plan-item-card__main">
                                                            <h4>{item.universities.name}</h4>
                                                            <span className="uni-card__location">📍 {item.universities.province}</span>
                                                        </Link>
                                                    ) : (
                                                        <span className="plan-item-card__main">未知院校</span>
                                                    )}
                                                    {item.majors && <Tag variant="primary">{item.majors.name}</Tag>}
                                                    <button className="plan-item-card__remove" onClick={() => handleRemoveItem(item.id)} title="移除">✕</button>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
