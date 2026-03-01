import { useEffect, useState, useRef, useCallback } from "react";
import {
    StreamVideo, StreamVideoClient, StreamCall,
    SpeakerLayout, CallControls, StreamTheme,
} from "@stream-io/video-react-sdk";
import CoachingPanel from "./CoachingPanel";
import QuestionCard from "./QuestionCard";
import StatsBar from "./StatsBar";
import { extractStats } from "../lib/Statsextractor.js";
import { Loader2 } from "lucide-react";
import "@stream-io/video-react-sdk/dist/css/styles.css";

export default function SessionScreen({ sessionData, modeConfig, onLeave }) {
    const [videoClient, setVideoClient] = useState(null);
    const [call, setCall] = useState(null);
    const [messages, setMessages] = useState([]);
    const [stats, setStats] = useState({});
    const [activeSchema, setActiveSchema] = useState(modeConfig?.stats_schema || []);
    const [error, setError] = useState(null);

    const callRef = useRef(null);
    const clientRef = useRef(null);
    const agentStartedRef = useRef(false);

    const activeSchemaRef = useRef(modeConfig?.stats_schema || []);

    const handleCustomEvent = useCallback((event) => {
        console.log("[SessionScreen] Raw custom event:", event);
        const data = event?.custom ?? event?.data ?? event?.payload ?? event;
        if (data?.type !== "coaching_feedback") return;

        if (data.stats_schema?.length) {
            setActiveSchema(data.stats_schema);
            activeSchemaRef.current = data.stats_schema;
        }

        const newMsg = {
            id: Date.now(),
            message: data.message || "",
            feedback_type: data.feedback_type || "info",
            timestamp: new Date(),
        };

        setMessages(prev => {
            const updated = [...prev, newMsg];
            const schema = data.stats_schema?.length ? data.stats_schema : activeSchemaRef.current;
            setStats(extractStats(updated, schema));
            return updated;
        });
    }, []);

    useEffect(() => {
        if (!call) return;
        const events = ["custom", "call.custom", "call.custom_event"];
        events.forEach(name => {
            try { call.on(name, handleCustomEvent); } catch (_) { }
        });
        return () => {
            events.forEach(name => {
                try { call.off(name, handleCustomEvent); } catch (_) { }
            });
        };
    }, [call, handleCustomEvent]);

    // Dev helper: window.__testCoaching("Focus score: 80. Distraction: 2. Posture issue.")
    useEffect(() => {
        window.__testCoaching = (message) => handleCustomEvent({
            custom: { type: "coaching_feedback", message, feedback_type: "info" }
        });
        return () => { delete window.__testCoaching; };
    }, [handleCustomEvent]);

    useEffect(() => {
        if (clientRef.current) return;
        const { api_key, user_id, token, call_id } = sessionData;
        if (!api_key || !user_id || !token) {
            setError("Missing credentials from backend.");
            return;
        }
        let mounted = true;

        async function initCall() {
            try {
                const vClient = new StreamVideoClient({ apiKey: api_key, options: { timeout: 15000 } });
                clientRef.current = vClient;
                await vClient.connectUser({ id: user_id, name: "Participant" }, token);
                if (!mounted) return;

                const myCall = vClient.call("default", call_id || "room_1");
                callRef.current = myCall;

                myCall.on("all", (event) => {
                    const type = event?.type ?? "unknown";
                    const noisy = ["AudioLevel", "ConnectionQuality", "mic.", "camera.", "stats", "health"];
                    if (!noisy.some(n => type.includes(n))) {
                        console.log("[Stream event]", type, event);
                    }
                });

                try {
                    await myCall.join({ create: true });
                } catch (joinErr) {
                    const isJoined = myCall.state?.callingState === "joined";
                    if (!isJoined && !String(joinErr).includes("find")) throw joinErr;
                }

                if (!mounted) return;

                setVideoClient(vClient);
                setCall(myCall);

                if (!agentStartedRef.current) {
                    agentStartedRef.current = true;
                    const API = import.meta.env.VITE_API_URL || '';
                    fetch(`${API}/sessions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mode: modeConfig?.id || "interview",
                            mode_config: {
                                instructions: modeConfig?.instructions,
                                greeting: modeConfig?.greeting,
                                yolo: modeConfig?.yolo || "yolo11n-pose.pt",
                                fps: modeConfig?.fps || 1,
                                stats_schema: modeConfig?.stats_schema || [],
                            },
                            call_id,
                            call_type: "default",
                        }),
                    })
                        .then(r => r.json())
                        .then(d => console.log("[SessionScreen] /sessions response:", d))
                        .catch(e => console.error("[SessionScreen] /sessions error:", e));
                }
            } catch (err) {
                console.error("[SessionScreen] initCall failed:", err);
                if (mounted) setError(err.message || String(err));
            }
        }

        initCall();

        return () => {
            mounted = false;
            callRef.current?.leave().catch(console.error);
            clientRef.current?.disconnectUser().catch(console.error);
            clientRef.current = null;
            agentStartedRef.current = false;
        };
    }, [sessionData, modeConfig]);

    const handleLeave = () => {
        callRef.current?.leave().catch(console.error);
        onLeave({ stats, messages, statsSchema: activeSchema });
    };

    if (error) return (
        <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "red", maxWidth: 400, textAlign: "center" }}>Connection error: {error}</p>
            <button onClick={onLeave}>Go Back</button>
        </div>
    );

    if (!videoClient || !call) return (
        <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
            <Loader2 className="animate-spin" size={48} color="var(--accent)" />
            <p style={{ color: "var(--text-muted)" }}>Connecting to coaching session...</p>
        </div>
    );

    return (
        <div className="main-content" style={{ flexDirection: "row", height: "100%" }}>
            <div className="video-container" style={{ position: "relative" }}>
                <StreamVideo client={videoClient}>
                    <StreamCall call={call}>
                        <StreamTheme style={{ width: "100%", height: "100%" }}>
                            <SpeakerLayout participantsBarPosition="bottom" />
                            <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 100 }}>
                                <CallControls onLeave={handleLeave} />
                            </div>
                        </StreamTheme>
                    </StreamCall>
                </StreamVideo>
                <StatsBar stats={stats} statsSchema={activeSchema} />
                <QuestionCard jobRole={modeConfig?.id} />
            </div>
            <CoachingPanel messages={messages} />
        </div>
    );
}