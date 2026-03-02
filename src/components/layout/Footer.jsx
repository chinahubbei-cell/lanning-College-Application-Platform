import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer__inner">
                <div className="footer__grid">
                    {/* Brand */}
                    <div className="footer__brand">
                        <div className="footer__logo">
                            <span>🎓</span>
                            <span className="footer__logo-text">志愿规划</span>
                        </div>
                        <p className="footer__desc">
                            智能高考志愿填报辅助平台，基于大数据与 AI 技术，帮助考生科学合理地规划志愿方案。
                        </p>
                    </div>

                    {/* Links */}
                    <div className="footer__links">
                        <h4 className="footer__links-title">功能导航</h4>
                        <a href="/recommend">智能推荐</a>
                        <a href="/universities">院校查询</a>
                        <a href="/majors">专业查询</a>
                        <a href="/analytics">数据分析</a>
                    </div>

                    <div className="footer__links">
                        <h4 className="footer__links-title">关于我们</h4>
                        <a href="#">使用指南</a>
                        <a href="#">数据来源</a>
                        <a href="#">隐私政策</a>
                        <a href="#">联系我们</a>
                    </div>

                    <div className="footer__links">
                        <h4 className="footer__links-title">技术支持</h4>
                        <a href="#">常见问题</a>
                        <a href="#">反馈建议</a>
                        <a href="#">更新日志</a>
                    </div>
                </div>

                <div className="footer__bottom">
                    <p>© {new Date().getFullYear()} 高考志愿规划平台. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
