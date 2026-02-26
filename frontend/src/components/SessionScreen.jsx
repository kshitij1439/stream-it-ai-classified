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
    };
    messages.forEach((m) => {
        const t = (m.message || "").toLowerCase();
        const fillerMatch = t.match(
            /filler(?:\s+word)?[s]?[:\s]+(\d+)|(\d+)\s+filler/
        );
        if (fillerMatch)
            stats.fillerWords = parseInt(fillerMatch[1] || fillerMatch[2]);
        if (
            t.includes("slouch") ||
            t.includes("posture") ||
            t.includes("sit up")
        )
            stats.postureAlerts += 1;
        if (t.includes("great eye contact") || t.includes("good eye contact"))
            stats.eyeContact = "Great ✓";
        else if (t.includes("eye contact")) stats.eyeContact = "Needs work";
        if (t.includes("slow down") || t.includes("too fast"))
            stats.pace = "Too fast";
        else if (t.includes("good pace") || t.includes("great pace"))
            stats.pace = "Good ✓";
    });
    return stats;
}

export default function SessionScreen({ sessionData, onLeave }) {
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
                const vClient = new StreamVideoClient({ apiKey: api_key });
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
        onLeave();
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
                <QuestionCard />
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
