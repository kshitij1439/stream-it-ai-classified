import { useEffect, useRef } from 'react';
import { MessageSquare, AlertTriangle, CheckCircle, Star, Info } from 'lucide-react';

const ICONS = {
    warning: <AlertTriangle size={14} color="#f97316" />,
    success: <CheckCircle size={14} color="#22c55e" />,
    score: <Star size={14} color="#a855f7" />,
    info: <Info size={14} color="#3b82f6" />,
};

const COLORS = {
    warning: { border: 'rgba(249,115,22,0.25)', bg: 'rgba(249,115,22,0.07)' },
    success: { border: 'rgba(34,197,94,0.25)', bg: 'rgba(34,197,94,0.07)' },
    score: { border: 'rgba(168,85,247,0.25)', bg: 'rgba(168,85,247,0.07)' },
    info: { border: 'rgba(59,130,246,0.25)', bg: 'rgba(59,130,246,0.07)' },
};

function fmt(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function CoachingPanel({ messages = [] }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="coaching-panel" style={{
            display: 'flex', flexDirection: 'column',
            height: '100%', overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <MessageSquare size={16} color="var(--accent)" />
                <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Live Coaching
                </span>
                {messages.length > 0 && (
                    <span style={{
                        marginLeft: 'auto', fontSize: 11,
                        background: 'rgba(255,255,255,0.08)',
                        padding: '2px 8px', borderRadius: 99,
                        color: 'var(--text-muted)',
                    }}>
                        {messages.length}
                    </span>
                )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 ? (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)', gap: 12, textAlign: 'center',
                    }}>
                        <MessageSquare size={32} style={{ opacity: 0.3 }} />
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Waiting for coach feedback...</div>
                            <div style={{ fontSize: 12, opacity: 0.6 }}>Speak to get started</div>
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const type = msg.feedback_type || 'info';
                        const { border, bg } = COLORS[type] || COLORS.info;
                        return (
                            <div key={msg.id} style={{
                                border: `1px solid ${border}`,
                                background: bg,
                                borderRadius: 8,
                                padding: '10px 12px',
                                animation: 'fadeSlideIn 0.25s ease',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    {ICONS[type] || ICONS.info}
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                        {fmt(msg.timestamp)}
                                    </span>
                                </div>
                                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-main)' }}>
                                    {msg.message}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}