import { useState } from 'react';
import LobbyScreen from './components/LobbyScreen';
import SessionScreen from './components/SessionScreen';
import ReportCard from './components/ReportCard';

function App() {
    const [sessionData, setSessionData] = useState(null);
    const [modeConfig, setModeConfig] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [joining, setJoining] = useState(false);
    const [showDemoModal, setShowDemoModal] = useState(false);

    const handleJoin = async (selectedMode, fullModeConfig) => {
        if (joining) return;
        setJoining(true);
        try {
            const API = import.meta.env.VITE_API_URL || '';

            const joinRes = await fetch(`${API}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: selectedMode }),
            });
            const data = await joinRes.json();

            await fetch(`${API}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: selectedMode,
                    mode_config: {
                        instructions: fullModeConfig?.instructions,
                        greeting: fullModeConfig?.greeting,
                        yolo: fullModeConfig?.yolo || "yolo11n-pose.pt",
                        fps: fullModeConfig?.fps || 1,
                        stats_schema: fullModeConfig?.stats_schema || [],
                    },
                    call_id: data.call_id,
                    call_type: "default",
                }),
            });

            await new Promise(r => setTimeout(r, 2000));

            setModeConfig(fullModeConfig);
            setSessionData({ ...data });
            setReportData(null);
        } catch (error) {
            console.error('Failed to join session:', error);
            setShowDemoModal(true);
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = (data) => {
        setSessionData(null);
        if (data?.stats) {
            setReportData(data);
        } else {
            setModeConfig(null);
        }
    };

    const handleBackToLobby = () => {
        setReportData(null);
        setModeConfig(null);
    };

    return (
        <div className="app-container">
            {!sessionData && !reportData ? (
                <LobbyScreen onJoin={handleJoin} joining={joining} />
            ) : reportData ? (
                <ReportCard
                    reportData={reportData}
                    jobRole={modeConfig?.id}
                    statsSchema={modeConfig?.stats_schema || []}
                    onBackToLobby={handleBackToLobby}
                />
            ) : (
                <SessionScreen
                    sessionData={sessionData}
                    modeConfig={modeConfig}
                    onLeave={handleLeave}
                />
            )}

            {showDemoModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={() => setShowDemoModal(false)}
                >
                    <div
                        style={{
                            background: '#1e1e2e', borderRadius: '16px', padding: '32px 36px',
                            maxWidth: '480px', width: '90%', textAlign: 'center',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: '#fff',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 12px', fontSize: '1.4rem' }}>🚀 GPU Backend Required</h3>
                        <p style={{ opacity: 0.8, lineHeight: 1.6, margin: '0 0 20px' }}>
                            The live session requires a GPU-backed backend. Watch the demo below to see how it works end-to-end.
                        </p>
                        <a
                            href="https://www.youtube.com/watch?v=mbGVku5KDQM"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-block', padding: '12px 28px',
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                color: '#fff', borderRadius: '10px', textDecoration: 'none',
                                fontWeight: 600, fontSize: '1rem',
                                transition: 'transform 0.2s',
                            }}
                            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                        >
                            ▶ Watch Demo on YouTube
                        </a>
                        <br />
                        <button
                            onClick={() => setShowDemoModal(false)}
                            style={{
                                marginTop: '16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff', padding: '8px 24px', borderRadius: '8px',
                                cursor: 'pointer', fontSize: '0.9rem', opacity: 0.7,
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
