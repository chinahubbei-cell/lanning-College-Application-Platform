import { useState, useRef, useEffect } from 'react';
import Card, { CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import supabase from '../../services/supabase';
import './Assistant.css';

const PRESET_QUESTIONS = [
    { icon: '🎯', text: '如何科学填报志愿？' },
    { icon: '📊', text: '分数线波动怎么分析？' },
    { icon: '🏫', text: '985和211有什么区别？' },
    { icon: '📚', text: '选专业应该考虑什么？' },
    { icon: '⚡', text: '冲/稳/保怎么选比例？' },
    { icon: '🌍', text: '如何评估院校实力？' },
    { icon: '🔮', text: '新高考改革有哪些变化？' },
    { icon: '💼', text: '哪些专业就业前景好？' },
];

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function Assistant() {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '您好！我是高考志愿规划 AI 助手「小志」🎓\n\n我由智谱 AI 大模型驱动，可以帮助您了解：\n- 志愿填报策略与技巧\n- 院校选择与专业分析\n- 分数线解读与趋势分析\n- 新高考政策与选科建议\n\n请选择下方话题或直接输入您的问题！',
        },
    ]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const chatEndRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const callAI = async (userMessages) => {
        // Build conversation history (last 10 messages for context)
        const history = userMessages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
        }));

        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ messages: history }),
        });

        if (!response.ok) {
            throw new Error(`AI 服务错误: ${response.status}`);
        }

        const data = await response.json();
        return data.reply;
    };

    const handleSend = async (text) => {
        const question = text || input.trim();
        if (!question || typing) return;

        const userMsg = { role: 'user', content: question };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setTyping(true);

        try {
            const reply = await callAI(newMessages);
            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        } catch (err) {
            console.error('AI call error:', err);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: '抱歉，AI 服务暂时不可用，请稍后重试。\n\n您也可以直接使用平台的其他功能：\n- 🎯 **智能推荐** — 根据分数自动匹配院校\n- 🏫 **院校查询** — 搜索和对比院校\n- 📊 **数据分析** — 查看可视化数据',
                },
            ]);
        } finally {
            setTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClear = () => {
        setMessages([
            {
                role: 'assistant',
                content: '对话已清除 ✨\n\n请输入新的问题，我随时准备为您解答！',
            },
        ]);
    };

    return (
        <div className="assistant-page container">
            <div className="assistant-layout">
                {/* Sidebar */}
                <aside className="assistant-sidebar animate-fade-in">
                    <h3 className="assistant-sidebar__title">💡 热门话题</h3>
                    <div className="assistant-sidebar__topics">
                        {PRESET_QUESTIONS.map((q, i) => (
                            <button
                                key={i}
                                className="assistant-topic-btn"
                                onClick={() => handleSend(q.text)}
                                disabled={typing}
                            >
                                <span>{q.icon}</span>
                                <span>{q.text}</span>
                            </button>
                        ))}
                    </div>
                    <div className="assistant-sidebar__actions">
                        <button className="assistant-topic-btn assistant-clear-btn" onClick={handleClear}>
                            <span>🗑️</span>
                            <span>清除对话</span>
                        </button>
                    </div>
                    <div className="assistant-sidebar__badge">
                        <span className="assistant-badge">🤖 智谱 GLM-4 驱动</span>
                    </div>
                </aside>

                {/* Chat Area */}
                <div className="assistant-chat animate-fade-in-up">
                    <div className="assistant-chat__header">
                        <div className="assistant-chat__avatar">🤖</div>
                        <div>
                            <h2 className="assistant-chat__name">AI 志愿助手「小志」</h2>
                            <span className="assistant-chat__status">
                                {typing ? '⏳ 思考中...' : '🟢 在线 · 智谱 AI'}
                            </span>
                        </div>
                    </div>

                    <div className="assistant-chat__messages">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`assistant-msg ${msg.role === 'user' ? 'assistant-msg--user' : 'assistant-msg--ai'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="assistant-msg__avatar">🤖</div>
                                )}
                                <div className="assistant-msg__bubble">
                                    <div className="assistant-msg__content">
                                        {msg.content.split('\n').map((line, j) => (
                                            <p key={j}>{line || <br />}</p>
                                        ))}
                                    </div>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="assistant-msg__avatar assistant-msg__avatar--user">👤</div>
                                )}
                            </div>
                        ))}
                        {typing && (
                            <div className="assistant-msg assistant-msg--ai">
                                <div className="assistant-msg__avatar">🤖</div>
                                <div className="assistant-msg__bubble">
                                    <div className="assistant-typing">
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="assistant-chat__input-area">
                        <div className="assistant-chat__input-wrapper">
                            <textarea
                                ref={textareaRef}
                                className="assistant-chat__input"
                                placeholder="输入您的问题...例如：我考了650分该怎么填志愿？"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                disabled={typing}
                            />
                            <Button
                                size="sm"
                                onClick={() => handleSend()}
                                disabled={!input.trim() || typing}
                                className="assistant-chat__send-btn"
                            >
                                {typing ? '...' : '发送'}
                            </Button>
                        </div>
                        <p className="assistant-chat__hint">按 Enter 发送，Shift+Enter 换行 · AI 回答仅供参考</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
