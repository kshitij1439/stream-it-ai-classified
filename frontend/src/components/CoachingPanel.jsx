import { MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';

export default function CoachingPanel() {
    // In a real app, these would come from the Stream Chat SDK or websocket channel
    const dummyFeedback = [
        { id: 1, type: 'info', text: "Agent connected. Analyzing expression and volume.", time: "10:00 AM" },
        { id: 2, type: 'warning', text: "Detected filler word 'um'. Try pausing instead.", time: "10:02 AM" },
        { id: 3, type: 'success', text: "Great eye contact on that last answer!", time: "10:05 AM" },
        { id: 4, type: 'danger', text: "Posture alert: You are slouching. Sit up straight to project confidence.", time: "10:08 AM" },
    ];

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={16} color="var(--success)" />;
            case 'warning': return <AlertCircle size={16} color="var(--warning)" />;
            case 'danger': return <AlertCircle size={16} color="var(--danger)" />;
            default: return <MessageSquare size={16} color="var(--accent)" />;
        }
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                    Live Coaching Feedback
                </div>
            </div>
            <div className="sidebar-content">
                {dummyFeedback.map(item => (
                    <div key={item.id} className={`feedback-item ${item.type}`}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ marginTop: '2px' }}>{getIcon(item.type)}</div>
                            <div>
                                <div style={{ fontSize: '14px', lineHeight: '1.4' }}>{item.text}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.time}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
