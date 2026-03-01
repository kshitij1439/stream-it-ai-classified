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

            // 1. Get Stream token + call_id from server
            const response = await fetch(`${API}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: selectedMode }),
            });
            const data = await response.json();

            // Store full mode config so SessionScreen can send it to agent
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