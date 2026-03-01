import { useState } from 'react';
import LobbyScreen from './components/LobbyScreen';
import SessionScreen from './components/SessionScreen';
import ReportCard from './components/ReportCard';

function App() {
    const [sessionData, setSessionData] = useState(null);
    const [modeConfig, setModeConfig] = useState(null);
    const [reportData, setReportData] = useState(null);

    // LobbyScreen calls onJoin(selectedModeId, fullModeConfig)
    const handleJoin = async (selectedMode, fullModeConfig) => {
        try {
            const API = import.meta.env.VITE_API_URL || '';

            // 1. Get token first (creates call_id)
            const joinRes = await fetch(`${API}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: selectedMode }),
            });
            const data = await joinRes.json();

            // 2. Spawn agent BEFORE user joins
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

            // 3. Small wait for agent to get ready
            await new Promise(r => setTimeout(r, 2000));

            // 4. NOW user joins
            setModeConfig(fullModeConfig);
            setSessionData({ ...data });
            setReportData(null);
        } catch (error) {
            console.error("Failed to join session:", error);
            alert("Failed to join session. Is the backend running?");
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
                <LobbyScreen onJoin={handleJoin} />
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
        </div>
    );
}

export default App;