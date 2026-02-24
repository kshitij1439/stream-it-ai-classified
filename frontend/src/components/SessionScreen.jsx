import { useEffect, useState } from 'react';
import { StreamVideo, StreamVideoClient, StreamCall, SpeakerLayout, CallControls, StreamTheme } from '@stream-io/video-react-sdk';
import CoachingPanel from './CoachingPanel';
import QuestionCard from './QuestionCard';
import StatsBar from './StatsBar';
import { Loader2 } from 'lucide-react';
import '@stream-io/video-react-sdk/dist/css/styles.css';

export default function SessionScreen({ sessionData, onLeave }) {
    const [client, setClient] = useState(null);
    const [call, setCall] = useState(null);

    useEffect(() => {
        const { api_key, user_id, token, call_id } = sessionData;
        if (!api_key || !user_id || !token) {
            alert("Missing credentials from backend. Please check backend/.env API keys.");
            return;
        }

        let isMounted = true;

        const myClient = new StreamVideoClient({
            apiKey: api_key,
            user: { id: user_id, name: "Interviewee" },
            token,
        });

        const myCall = myClient.call('default', call_id || 'interview_room_1');
        myCall.join({ create: true }).then(() => {
            if (isMounted) {
                setCall(myCall);
            }
        }).catch(err => {
            console.error("Failed to join call", err);
        });

        setClient(myClient);

        return () => {
            isMounted = false;
            myCall.leave().catch(console.error).finally(() => {
                myClient.disconnectUser();
            });
        };
    }, [sessionData]);

    if (!client || !call) return (
        <div className="main-content" style={{ flexDirection: 'row', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <Loader2 className="animate-spin" size={48} color="var(--accent)" />
                <p style={{ color: "var(--text-muted)" }}>Connecting to Stream platform...</p>
            </div>
        </div>
    );

    return (
        <div className="main-content" style={{ flexDirection: 'row', height: '100%' }}>
            {/* Main Video Area */}
            <div className="video-container" style={{ position: 'relative' }}>

                <StreamVideo client={client}>
                    <StreamCall call={call}>
                        <StreamTheme className="stream-theme-custom" style={{ width: '100%', height: '100%' }}>
                            <SpeakerLayout participantsBarPosition="bottom" />
                            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
                                <CallControls onLeave={() => {
                                    call.leave().then(() => {
                                        client.disconnectUser();
                                        onLeave();
                                    })
                                }} />
                            </div>
                        </StreamTheme>
                    </StreamCall>
                </StreamVideo>

                <StatsBar />

                <div style={{ position: 'absolute', top: '40px', left: '0', right: '0', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
                    <QuestionCard />
                </div>

            </div>

            {/* Right Sidebar for Coaching Feedback */}
            <CoachingPanel />
        </div>
    );
}
