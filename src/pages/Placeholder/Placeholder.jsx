import './Placeholder.css';

export function ComingSoon({ title, icon, description }) {
    return (
        <div className="coming-soon">
            <div className="coming-soon__content">
                <span className="coming-soon__icon">{icon}</span>
                <h1 className="coming-soon__title">{title}</h1>
                <p className="coming-soon__desc">{description || '此功能正在开发中，即将上线，敬请期待！'}</p>
                <div className="coming-soon__badge">🚧 开发中</div>
            </div>
        </div>
    );
}

export function RecommendPlaceholder() {
    return <ComingSoon title="智能推荐" icon="🎯" description="基于分数和位次的智能院校推荐功能即将上线" />;
}

export function UniversityListPlaceholder() {
    return <ComingSoon title="院校查询" icon="🏫" description="全国高校信息查询与检索功能即将上线" />;
}

export function MajorListPlaceholder() {
    return <ComingSoon title="专业查询" icon="📚" description="专业方向浏览与搜索功能即将上线" />;
}

export function PlanListPlaceholder() {
    return <ComingSoon title="方案管理" icon="📋" description="志愿方案创建与管理功能即将上线" />;
}

export function AnalyticsPlaceholder() {
    return <ComingSoon title="数据分析" icon="📊" description="分数线趋势与录取概率分析功能即将上线" />;
}

export function AssistantPlaceholder() {
    return <ComingSoon title="AI 问答助手" icon="🤖" description="AI 智能问答功能即将上线" />;
}

export function ProfilePlaceholder() {
    return <ComingSoon title="个人中心" icon="👤" description="个人信息管理和收藏功能即将上线" />;
}

export function LoginPlaceholder() {
    return <ComingSoon title="用户登录" icon="🔑" description="注册与登录功能即将上线" />;
}

export function RegisterPlaceholder() {
    return <ComingSoon title="用户注册" icon="✨" description="注册功能即将上线" />;
}

export function NotFound() {
    return <ComingSoon title="404" icon="😵" description="页面未找到，请检查 URL 是否正确" />;
}
