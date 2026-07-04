import { useState } from 'react';
import LobbyScreen from './components/LobbyScreen';
import SessionScreen from './components/SessionScreen';
import ReportCard from './components/ReportCard';

function App() {
    const [sessionData, setSessionData] = useState(null);
    const [modeConfig, setModeConfig] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [joining, setJoining] = useState(false);

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
            // Backend not available — fall back to demo video mode
            setModeConfig(fullModeConfig);
            setSessionData({ demo: true });
            setReportData(null);
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
        setSessionData(null);
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
            ) : sessionData?.demo ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    gap: '24px',
                    padding: '20px',
                    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
                    color: '#fff',
                }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                        🎬 Session Demo Preview
                    </h2>
                    <p style={{ opacity: 0.7, maxWidth: 520, textAlign: 'center' }}>
                        The live session requires a GPU-backed backend. Watch the demo below to see how it works end-to-end.
                    </p>
                    <div style={{
                        width: '100%',
                        maxWidth: '800px',
                        aspectRatio: '16/9',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}>
                        <iframe
                            width="100%"
                            height="100%"
                            src="https://www.youtube.com/embed/mbGVku5KDQM?autoplay=1"
                            title="Session Demo"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ border: 'none' }}
                        />
                    </div>
                    <button
                        onClick={handleBackToLobby}
                        style={{
                            marginTop: '12px',
                            padding: '12px 32px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: '#fff',
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 4px 20px rgba(102,126,234,0.5)'; }}
                        onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = 'none'; }}
                    >
                        ← Back to Lobby
                    </button>
                </div>
            ) : (
                <SessionScreen
                    sessionData={sessionData}
                    modeConfig={modeConfig}
                    onLeave={handleLeave}
                />
            )}
        </div>
    );
}

export default App;
