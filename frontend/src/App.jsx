import { useState } from 'react';
import LobbyScreen from './components/LobbyScreen';
import SessionScreen from './components/SessionScreen';

function App() {
    const [sessionData, setSessionData] = useState(null);

    const handleJoin = async () => {
        try {
            const response = await fetch('/join', { method: 'POST' });
            const data = await response.json();
            setSessionData(data);
        } catch (error) {
            console.error("Failed to join session:", error);
            alert("Failed to join session. Is the backend running?");
        }
    };

    const handleLeave = () => {
        setSessionData(null);
    };

    return (
        <div className="app-container">
            {!sessionData ? (
                <LobbyScreen onJoin={handleJoin} />
            ) : (
                <SessionScreen sessionData={sessionData} onLeave={handleLeave} />
            )}
        </div>
    );
}

export default App;
