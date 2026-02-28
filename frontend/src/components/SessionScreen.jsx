import { useEffect, useState, useRef, useCallback } from "react";
import {
    StreamVideo,
    StreamVideoClient,
    StreamCall,
    SpeakerLayout,
    CallControls,
    StreamTheme,
} from "@stream-io/video-react-sdk";
import CoachingPanel from "./CoachingPanel";
import QuestionCard from "./QuestionCard";
import StatsBar from "./StatsBar";
import { Loader2 } from "lucide-react";
import "@stream-io/video-react-sdk/dist/css/styles.css";

function extractStats(messages) {
    const stats = {
        fillerWords: 0,
        postureAlerts: 0,
        eyeContact: "—",
        pace: "—",
        confidence: 100,
        formAlerts: 0,
        positiveForm: 0,
    };

    const fullText = messages.map((m) => m.message || "").join(" ").toLowerCase();

    const fillerMatches = [...fullText.matchAll(/filler(?:\s+word)?[s]?[:\s-]+(\d+)|(\d+)\s+filler/g)];
    stats.fillerWords = fillerMatches.reduce((sum, match) => sum + parseInt(match[1] || match[2] || "0", 10), 0);

    if (stats.fillerWords === 0) {
        const genericMatch = fullText.match(/filler word/g);
        if (genericMatch) stats.fillerWords = genericMatch.length;
    }

    const postureMatches = fullText.match(/slouch|posture issue|sit up|plant|sway/g);
    stats.postureAlerts = postureMatches ? postureMatches.length : 0;

    if (fullText.includes("great eye contact") || fullText.includes("good eye contact") || fullText.includes("excellent eye contact")) {
        stats.eyeContact = "Great ✓";
    }
    if (fullText.includes("needs eye contact") || fullText.includes("eye contact issue") || fullText.includes("look at the camera")) {
        stats.eyeContact = "Needs work";
    }

    if (fullText.includes("good pace") || fullText.includes("great pace")) {
        stats.pace = "Good ✓";
    }
    if (fullText.includes("too fast") || fullText.includes("slow down") || fullText.includes("speed issue")) {
        stats.pace = "Too fast";
    }

    const formAlertsMatches = fullText.match(/go deeper|chest up|slow the descent|watch your back|form issue/g);
    stats.formAlerts = formAlertsMatches ? formAlertsMatches.length : 0;

    const positiveFormMatches = fullText.match(/great form|good form|excellent form/g);
    stats.positiveForm = positiveFormMatches ? positiveFormMatches.length : 0;

    let score = 100;
    score -= (stats.fillerWords * 3);
    score -= (stats.postureAlerts * 5);
    score -= (stats.formAlerts * 5);
    if (stats.eyeContact === "Needs work") score -= 10;
    if (stats.eyeContact === "Great ✓") score += 5;
    if (stats.pace === "Too fast") score -= 5;
    if (stats.pace === "Good ✓") score += 5;
    if (stats.positiveForm > 0) score += (stats.positiveForm * 5);

    stats.confidence = Math.max(0, Math.min(100, Math.round(score)));

    return stats;
}

export default function SessionScreen({ sessionData, jobRole, onLeave }) {
    const [videoClient, setVideoClient] = useState(null);
    const [call, setCall] = useState(null);
    const [messages, setMessages] = useState([]);
    const [stats, setStats] = useState({});
    const [eventLog, setEventLog] = useState([]);
    const [error, setError] = useState(null);

    const callRef = useRef(null);
    const clientRef = useRef(null);
    const agentStartedRef = useRef(false);

    // ── FIX 1: Define handler with useCallback BEFORE useEffect ──────────────
    // This ensures the function reference is stable and correct when subscribed.
    const handleCustomEvent = useCallback((event) => {
        console.log("[SessionScreen] Raw custom event:", JSON.stringify(event, null, 2));

        // ── FIX 2: Stream sends custom events with this shape: ────────────────
        // { type: "custom", custom: { type: "coaching_feedback", message: "..." } }
        // The agent's send_custom_event payload lands in event.custom
        const data = event?.custom ?? event?.data ?? event?.payload ?? event;

        console.log("[SessionScreen] Parsed data:", data);

        if (data?.type !== "coaching_feedback") {
            console.log("[SessionScreen] Ignoring non-coaching event. data.type =", data?.type);
            return;
        }

        const newMsg = {
            id: Date.now(),
            message: data.message || "",
            feedback_type: data.feedback_type || "info",
            timestamp: new Date(),
        };

        console.log("[SessionScreen] ✅ Adding coaching message:", newMsg);

        setMessages((prev) => {
            const updated = [...prev, newMsg];
            setStats(extractStats(updated));
            return updated;
        });
    }, []);

    useEffect(() => {
        if (clientRef.current) return;

        const { api_key, user_id, token, call_id } = sessionData;
        if (!api_key || !user_id || !token) {
            setError("Missing credentials from backend. Check backend/.env");
            return;
        }

        let mounted = true;

        async function initCall() {
            try {
                const vClient = new StreamVideoClient({
                    apiKey: api_key,
                    options: { timeout: 15000 },
                });
                clientRef.current = vClient;

                await vClient.connectUser({ id: user_id, name: "Interviewee" }, token);
                console.log("[SessionScreen] connectUser OK");
                if (!mounted) return;

                const myCall = vClient.call("default", call_id || "interview_room_1");
                callRef.current = myCall;

                // Debug overlay — log all non-noisy events
                myCall.on("all", (event) => {
                    const type = event?.type ?? event?.constructor?.name ?? "unknown";
                    const noisy = ["AudioLevel", "ConnectionQuality", "mic.", "camera.", "stats", "health"];
                    if (!noisy.some((n) => type.includes(n))) {
                        console.log("[Stream event]", type, event);
                        setEventLog((prev) => [...prev.slice(-20), { type, ts: Date.now() }]);
                    }
                });

                try {
                    await myCall.join({ create: true });
                } catch (joinErr) {
                    const stateVal = myCall.state?.callingState;
                    const isJoined =
                        stateVal === "joined" ||
                        myCall.state?.participants?.getValue?.()?.length > 0;
                    if (isJoined || String(joinErr).includes("find")) {
                        console.warn("[SessionScreen] join() threw but call is usable:", joinErr.message);
                    } else {
                        throw joinErr;
                    }
                }

                console.log("[SessionScreen] Joined call successfully");
                if (!mounted) return;

                // ── FIX 3: Subscribe AFTER join, using the stable handler ref ──
                // Stream fires "custom" for call.sendCustomEvent() from the agent.
                // We subscribe to all likely event names for safety.
                const eventNames = ["custom", "call.custom", "call.custom_event"];
                eventNames.forEach((name) => {
                    try {
                        myCall.on(name, handleCustomEvent);
                        console.log(`[SessionScreen] ✅ Subscribed to: ${name}`);
                    } catch (e) {
                        console.warn(`[SessionScreen] Could not subscribe to '${name}':`, e);
                    }
                });

                setVideoClient(vClient);
                setCall(myCall);

                // Launch agent (once only)
                if (!agentStartedRef.current) {
                    const API = import.meta.env.VITE_API_URL || '';
                    agentStartedRef.current = true;
                    fetch(`${API}/sessions`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            call_id: call_id || "interview_room_1",
                            call_type: "default",
                            mode: jobRole || "interview",
                        }),
                    })
                        .then((r) => r.json())
                        .then((d) => console.log("[SessionScreen] /sessions response:", d))
                        .catch((e) => console.error("[SessionScreen] /sessions error:", e));
                }
            } catch (err) {
                console.error("[SessionScreen] initCall failed:", err);
                if (mounted) setError(err.message || String(err));
            }
        }

        initCall();

        return () => {
            mounted = false;
            console.warn("[SessionScreen] CLEANUP — leaving call");
            // ── FIX 4: Unsubscribe the handler on cleanup to prevent leaks ───
            if (callRef.current) {
                ["custom", "call.custom", "call.custom_event"].forEach((name) => {
                    try { callRef.current.off(name, handleCustomEvent); } catch (_) { }
                });
            }
            callRef.current?.leave().catch(console.error);
            clientRef.current?.disconnectUser().catch(console.error);
            clientRef.current = null;
            agentStartedRef.current = false;
        };
    }, [sessionData, handleCustomEvent]);

    // ── Manual test helper (dev only) ────────────────────────────────────────
    // Open browser console and run: window.__testCoaching("Filler words: 3. Posture issue. Great eye contact.")
    useEffect(() => {
        if (process.env.NODE_ENV !== "development") return;
        window.__testCoaching = (message) => {
            handleCustomEvent({
                custom: { type: "coaching_feedback", message, feedback_type: "info" }
            });
        };
        console.log("[SessionScreen] 🧪 Test helper ready: window.__testCoaching('your message here')");
        return () => { delete window.__testCoaching; };
    }, [handleCustomEvent]);

    const handleLeave = () => {
        callRef.current?.leave().catch(console.error);
        onLeave({ stats, messages });
    };

    if (error)
        return (
            <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
                <p style={{ color: "red", maxWidth: 400, textAlign: "center" }}>Connection error: {error}</p>
                <button onClick={onLeave}>Go Back</button>
            </div>
        );

    if (!videoClient || !call)
        return (
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
                <StatsBar stats={stats} />
                <QuestionCard jobRole={jobRole} />
            </div>

            <CoachingPanel messages={messages} />

            {process.env.NODE_ENV === "development" && (
                <div style={{
                    position: "fixed", bottom: 8, right: 8,
                    background: "rgba(0,0,0,0.85)", color: "#00ff88",
                    fontSize: 10, padding: 8, borderRadius: 6,
                    maxWidth: 280, maxHeight: 180, overflow: "auto",
                    zIndex: 9999, fontFamily: "monospace", lineHeight: 1.4,
                }}>
                    <strong style={{ color: "#fff" }}>Stream events:</strong>
                    {eventLog.length === 0 && <div style={{ color: "#888" }}>none yet...</div>}
                    {eventLog.map((e, i) => (
                        <div key={i} style={{ color: e.type.includes("custom") ? "#ffff00" : "#00ff88" }}>
                            {e.type}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
