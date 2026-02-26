import { Mic, Video, ChevronRight } from 'lucide-react';

export default function LobbyScreen({ onJoin }) {
    return (
        <div className="lobby-container">
            <div className="lobby-card">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(88, 166, 255, 0.1)', padding: '16px', borderRadius: '50%' }}>
                        <Video size={48} color="var(--accent)" />
                    </div>
                </div>
                <h1 className="lobby-title">Vision Possible: Agent Protocol</h1>
                <p className="lobby-subtitle">Real-Time Interview Coach powered by Gemini & WeMakeDevs SDK</p>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', marginBottom: '24px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <Mic size={18} color="var(--text-muted)" />
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Microphone check...</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Video size={18} color="var(--text-muted)" />
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Camera check...</span>
                    </div>
                </div>

                <button
                    className="btn-primary"
                    onClick={onJoin}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px' }}
                >
                    Start Session
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
