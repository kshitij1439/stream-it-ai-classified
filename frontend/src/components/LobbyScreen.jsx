import { useState, useEffect } from 'react';
import { Mic, Video, ChevronRight, LayoutGrid } from 'lucide-react';

export default function LobbyScreen({ onJoin }) {
    const [selectedMode, setSelectedMode] = useState("interview");
    const [modes, setModes] = useState([
        { id: "interview", name: "Interview Coach", description: "Strict but kind AI interview coach." },
        { id: "gym", name: "Gym Trainer", description: "Safety-focused AI trainer to track form." },
        { id: "speaking", name: "Public Speaking Coach", description: "Encouraging AI coach for presentations." }
    ]);
    const [loading, setLoading] = useState(false); // set to false instantly so we never block

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL || ''}/modes`)
            .then(res => {
                if (!res.ok) throw new Error("Network response was not ok");
                return res.json();
            })
            .then(data => {
                if (data && data.modes && data.modes.length > 0) {
                    setModes(data.modes);
                }
            })
            .catch(err => {
                console.error("Error fetching modes (using fallbacks):", err);
            });
    }, []);

    return (
        <div className="lobby-container">
            <div className="lobby-card">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(88, 166, 255, 0.1)', padding: '16px', borderRadius: '50%' }}>
                        <Video size={48} color="var(--accent)" />
                    </div>
                </div>
                <h1 className="lobby-title">VisionStudio AI</h1>
                <p className="lobby-subtitle">Real-Time Universal Human Performance Engine</p>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', marginBottom: '20px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <LayoutGrid size={18} color="var(--accent)" />
                        <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>Select Agent Mode</span>
                    </div>

                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading modes...</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                            {modes.map(mode => (
                                <div
                                    key={mode.id}
                                    onClick={() => setSelectedMode(mode.id)}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '8px',
                                        background: selectedMode === mode.id ? 'rgba(88, 166, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${selectedMode === mode.id ? 'var(--accent)' : 'var(--border)'}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}
                                >
                                    <div style={{ color: selectedMode === mode.id ? '#fff' : 'var(--text-main)', fontWeight: 600, fontSize: '15px' }}>
                                        {mode.name}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.4' }}>
                                        {mode.description}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

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
                    onClick={() => onJoin(selectedMode)}
                    disabled={loading}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px' }}
                >
                    Start Session
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
