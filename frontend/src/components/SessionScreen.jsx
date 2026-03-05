import { useEffect, useState, useRef, useCallback } from "react";
import {
    StreamVideo, StreamVideoClient, StreamCall,
    SpeakerLayout, CallControls, StreamTheme,
} from "@stream-io/video-react-sdk";
import CoachingPanel from "./CoachingPanel";
import QuestionCard from "./QuestionCard";
import StatsBar from "./StatsBar";
import { extractStats } from "../lib/Statsextractor.js";
import { Loader2, BarChart2, HelpCircle, MessageSquare } from "lucide-react";
import "@stream-io/video-react-sdk/dist/css/styles.css";

function ToggleBtn({ icon: Icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            title={`${active ? "Hide" : "Show"} ${label}`}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: active ? "rgba(88,166,255,0.18)" : "rgba(15,22,36,0.75)",
                border: `1px solid ${active ? "rgba(88,166,255,0.4)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 8,
                color: active ? "#58a6ff" : "#94a3b8",
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                backdropFilter: "blur(8px)",
                transition: "all 0.18s",
                whiteSpace: "nowrap",
            }}
        >
            <Icon size={13} />
            {label}
        </button>
    );
}

export default function SessionScreen({ sessionData, modeConfig, onLeave }) {
    const [videoClient, setVideoClient] = useState(null);
    const [call, setCall] = useState(null);
    const [messages, setMessages] = useState([]);
    const [stats, setStats] = useState({});
    const [activeSchema, setActiveSchema] = useState(modeConfig?.stats_schema || []);
    const [error, setError] = useState(null);

    const [showStats, setShowStats] = useState(true);
    const [showQuestions, setShowQuestions] = useState(true);
    const [showCoaching, setShowCoaching] = useState(true);

    const callRef = useRef(null);
    const clientRef = useRef(null);
    
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

                {showStats && <StatsBar stats={stats} statsSchema={activeSchema} />}
                {showQuestions && <QuestionCard jobRole={modeConfig?.id} />}

                {/* 3 toggle buttons — bottom left */}
                <div style={{
                    position: "absolute",
                    bottom: 34,
                    left: 16,
                    zIndex: 200,
                    // display: "flex",
                    margin:3,
                    gap: 6,
                }}>
                    <ToggleBtn icon={BarChart2} label="Stats" active={showStats} onClick={() => setShowStats(v => !v)} />
                    <ToggleBtn icon={HelpCircle} label="Questions" active={showQuestions} onClick={() => setShowQuestions(v => !v)} />
                    <ToggleBtn icon={MessageSquare} label="Coaching" active={showCoaching} onClick={() => setShowCoaching(v => !v)} />
                </div>
            </div>

            {showCoaching && <CoachingPanel messages={messages} />}
        </div>
    );
}