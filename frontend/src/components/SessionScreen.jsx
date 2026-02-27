import { useEffect, useState, useRef } from "react";
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

    // Combine all transcript chunks into one text so that phrases severed across events can be matched
    const fullText = messages.map((m) => m.message || "").join(" ").toLowerCase();

    // 1. Count fillers (explicit feedback like "Filler words: 2")
    const fillerMatches = [...fullText.matchAll(/filler(?:\s+word)?[s]?[:\s-]+(\d+)|(\d+)\s+filler/g)];
    stats.fillerWords = fillerMatches.reduce((sum, match) => sum + parseInt(match[1] || match[2] || "0", 10), 0);

    // Fallback: if agent didn't list a number but just said "filler words detected", we can add roughly 1 for each mention
    if (stats.fillerWords === 0) {
        const genericMatch = fullText.match(/filler word/g);
        if (genericMatch) stats.fillerWords = genericMatch.length;
    }

    // 2. Posture alerts
    const postureMatches = fullText.match(/slouch|posture issue|sit up|plant|sway/g);
    stats.postureAlerts = postureMatches ? postureMatches.length : 0;

    // 3. Eye contact
    if (fullText.includes("great eye contact") || fullText.includes("good eye contact") || fullText.includes("excellent eye contact")) {
        stats.eyeContact = "Great ✓";
    }
    if (fullText.includes("needs eye contact") || fullText.includes("eye contact issue") || fullText.includes("look at the camera")) {
        stats.eyeContact = "Needs work";
    }

    // 4. Pace
    if (fullText.includes("good pace") || fullText.includes("great pace")) {
        stats.pace = "Good ✓";
    }
    if (fullText.includes("too fast") || fullText.includes("slow down") || fullText.includes("speed issue")) {
        stats.pace = "Too fast";
    }

    // 5. Gym Form
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

    useEffect(() => {
        if (clientRef.current) return; // React StrictMode guard

        const { api_key, user_id, token, call_id } = sessionData;
        if (!api_key || !user_id || !token) {
            setError("Missing credentials from backend. Check backend/.env");
            return;
        }

        let mounted = true;

        async function initCall() {
            try {
                // Step 1: create client, then connectUser explicitly
                const vClient = new StreamVideoClient({
                    apiKey: api_key,
                    options: { timeout: 15000 },
                });
                clientRef.current = vClient;

                await vClient.connectUser(
                    { id: user_id, name: "Interviewee" },
                    token
                );
                console.log("[SessionScreen] connectUser OK");
                if (!mounted) return;

                // Step 2: create call
                const myCall = vClient.call(
                    "default",
                    call_id || "interview_room_1"
                );
                callRef.current = myCall;

                // Debug overlay
                myCall.on("all", (event) => {
                    const type =
                        event?.type ?? event?.constructor?.name ?? "unknown";
                    if (
                        ![
                            "AudioLevel",
                            "ConnectionQuality",
                            "mic.",
                            "camera.",
                            "stats",
                            "health",
                        ].some((n) => type.includes(n))
                    ) {
                        console.log("[Stream event]", type, event);
                        setEventLog((prev) => [
                            ...prev.slice(-20),
                            { type, ts: Date.now() },
                        ]);
                    }
                });

                // Step 3: join the call.
                // Stream SDK bug: applyDeviceConfig calls .find() on undefined device list.
                // The error is non-fatal — the join actually succeeds — so we catch and
                // verify the call state before deciding whether to rethrow.
                try {
                    await myCall.join({ create: true });
                } catch (joinErr) {
                    const stateVal = myCall.state?.callingState;
                    const isJoined =
                        stateVal === "joined" ||
                        myCall.state?.participants?.getValue?.()?.length > 0;
                    if (isJoined || String(joinErr).includes("find")) {
                        console.warn(
                            "[SessionScreen] join() threw but call is usable:",
                            joinErr.message
                        );
                        // continue — call is joined
                    } else {
                        throw joinErr;
                    }
                }

                console.log("[SessionScreen] Joined call successfully");
                if (!mounted) return;

                setVideoClient(vClient);
                setCall(myCall);

                // Step 4: launch agent (once only)
                if (!agentStartedRef.current) {
                    agentStartedRef.current = true;
                    fetch("/sessions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            call_id: call_id || "interview_room_1",
                            call_type: "default",
                            mode: jobRole || "interview",
                        }),
                    })
                        .then((r) => r.json())
                        .then((d) =>
                            console.log(
                                "[SessionScreen] /sessions response:",
                                d
                            )
                        )
                        .catch((e) =>
                            console.error("[SessionScreen] /sessions error:", e)
                        );
                }

                // Step 5: subscribe to coaching events
                [
                    "custom",
                    "call.custom",
                    "customEvent",
                    "call.custom_event",
                ].forEach((name) => {
                    try {
                        myCall.on(name, handleCustomEvent);
                    } catch (e) {
                        console.warn(
                            "[SessionScreen] Could not subscribe to:",
                            name,
                            e
                        );
                    }
                });
            } catch (err) {
                console.error("[SessionScreen] initCall failed:", err);
                if (mounted) setError(err.message || String(err));
            }
        }

        initCall();

        return () => {
            mounted = false;
            console.warn("[SessionScreen] CLEANUP FIRED — leaving call");  // add this
            callRef.current?.leave().catch(console.error);
            clientRef.current?.disconnectUser().catch(console.error);
            clientRef.current = null;
            agentStartedRef.current = false;
        };
    }, [sessionData]);

    function handleCustomEvent(event) {
        console.log(
            "[SessionScreen] Raw custom event:",
            JSON.stringify(event, null, 2)
        );
        const data = event?.custom ?? event?.data ?? event?.payload ?? event;
        if (data?.type !== "coaching_feedback") {
            console.log("[SessionScreen] Ignoring event type:", data?.type);
            return;
        }
        const newMsg = {
            id: Date.now(),
            message: data.message || "",
            feedback_type: data.feedback_type || "info",
            timestamp: new Date(),
        };
        console.log("[SessionScreen] Adding coaching message:", newMsg);
        setMessages((prev) => {
            const updated = [...prev, newMsg];
            setStats(extractStats(updated));
            return updated;
        });
    }

    const handleLeave = () => {
        callRef.current?.leave().catch(console.error);
        onLeave({ stats, messages });
    };

    if (error)
        return (
            <div
                style={{
                    display: "flex",
                    height: "100vh",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 16,
                }}
            >
                <p style={{ color: "red", maxWidth: 400, textAlign: "center" }}>
                    Connection error: {error}
                </p>
                <button onClick={onLeave}>Go Back</button>
            </div>
        );

    if (!videoClient || !call)
        return (
            <div
                style={{
                    display: "flex",
                    height: "100vh",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 20,
                }}
            >
                <Loader2
                    className="animate-spin"
                    size={48}
                    color="var(--accent)"
                />
                <p style={{ color: "var(--text-muted)" }}>
                    Connecting to coaching session...
                </p>
            </div>
        );

    return (
        <div
            className="main-content"
            style={{ flexDirection: "row", height: "100%" }}
        >
            <div className="video-container" style={{ position: "relative" }}>
                <StreamVideo client={videoClient}>
                    <StreamCall call={call}>
                        <StreamTheme style={{ width: "100%", height: "100%" }}>
                            <SpeakerLayout participantsBarPosition="bottom" />
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: 20,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    zIndex: 100,
                                }}
                            >
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
                <div
                    style={{
                        position: "fixed",
                        bottom: 8,
                        right: 8,
                        background: "rgba(0,0,0,0.85)",
                        color: "#00ff88",
                        fontSize: 10,
                        padding: 8,
                        borderRadius: 6,
                        maxWidth: 280,
                        maxHeight: 180,
                        overflow: "auto",
                        zIndex: 9999,
                        fontFamily: "monospace",
                        lineHeight: 1.4,
                    }}
                >
                    <strong style={{ color: "#fff" }}>Stream events:</strong>
                    {eventLog.length === 0 && (
                        <div style={{ color: "#888" }}>none yet...</div>
                    )}
                    {eventLog.map((e, i) => (
                        <div
                            key={i}
                            style={{
                                color: e.type.includes("custom")
                                    ? "#ffff00"
                                    : "#00ff88",
                            }}
                        >
                            {e.type}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
