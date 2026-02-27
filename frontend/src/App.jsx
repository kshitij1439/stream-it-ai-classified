import { useState } from 'react';
import LobbyScreen from './components/LobbyScreen';
import SessionScreen from './components/SessionScreen';
import ReportCard from './components/ReportCard';

function App() {
    const [sessionData, setSessionData] = useState(null);
    const [jobRole, setJobRole] = useState(null);
    const [reportData, setReportData] = useState(null);

    const handleJoin = async (selectedMode) => {
        try {
            const response = await fetch('/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: selectedMode })
            });
            const data = await response.json();
            setJobRole(selectedMode); // Storing selectedMode in jobRole for backward compatibility
            setSessionData(data);
            setReportData(null);
        } catch (error) {
            console.error("Failed to join session:", error);
            alert("Failed to join session. Is the backend running?");
        }
    };

    const handleLeave = (data) => {
        setSessionData(null);
        if (data && data.stats) {
            setReportData(data);
        } else {
            setJobRole(null);
        }
    };

    const handleBackToLobby = () => {
        setReportData(null);
        setJobRole(null);
    };

    return (
        <div className="app-container">
            {!sessionData && !reportData ? (
                <LobbyScreen onJoin={handleJoin} />
            ) : reportData ? (
                <ReportCard reportData={reportData} jobRole={jobRole} onBackToLobby={handleBackToLobby} />
            ) : (
                <SessionScreen sessionData={sessionData} jobRole={jobRole} onLeave={handleLeave} />
            )}
        </div>
    );
}

export default App;
