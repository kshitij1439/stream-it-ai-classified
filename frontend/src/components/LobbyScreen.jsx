import { useState, useEffect } from 'react';
import { Mic, Video, ChevronRight, LayoutGrid, Plus, X, Sliders, Zap, ChevronDown, ChevronUp, Info } from 'lucide-react';

const MODE_ICONS = { briefcase: "💼", dumbbell: "🏋️", mic: "🎤", "chef-hat": "👨‍🍳", monitor: "🖥️", custom: "⚡" };

const STAT_TYPE_OPTIONS = [
    { value: "score", label: "Score (0–100%)" },
    { value: "count", label: "Count (number)" },
    { value: "status", label: "Status (text)" },
    { value: "value", label: "Value + unit" },
];

const ICON_OPTIONS = ["TrendingUp", "Activity", "Eye", "Mic", "User", "AlertTriangle", "Shield", "Repeat", "Star", "Zap"];

const YOLO_MODELS = [
    { value: "yolo11n-pose.pt", label: "Pose — body keypoints", available: true },
    { value: "yolo11n.pt",      label: "Detection — objects — coming soon", available: false },
    { value: "yolo11n-seg.pt",  label: "Segmentation — coming soon",        available: false },
];

export const BUILTIN_MODES = [
    {
        id: "interview", name: "Interview Coach", description: "Technical & behavioral interview practice.", icon: "briefcase",
        yolo: "yolo11n-pose.pt", fps: 1,
        instructions: "You are a strict but kind AI interview coach. Watch the user's video feed and listen to their answers. Ask them specific technical and behavioral questions. Provide real-time feedback. VERY IMPORTANT: To update the UI metrics, you MUST use these key phrases in your feedback when relevant: 'Filler words: X' (where X is count of um/uhs), 'Posture issue' (if slouching), 'Great eye contact' or 'Needs eye contact', 'Good pace' or 'Too fast'. Be concise.",
        greeting: "Hello! I am your AI interview coach. Please introduce yourself when you are ready.",
        stats_schema: [
            { key: "confidence",    label: "Confidence",     type: "score",  icon: "TrendingUp" },
            { key: "eyeContact",    label: "Eye Contact",    type: "status", icon: "Eye" },
            { key: "pace",          label: "Pace",           type: "status", icon: "Activity" },
            { key: "fillerWords",   label: "Filler Words",   type: "count",  icon: "Mic" },
            { key: "postureAlerts", label: "Posture Alerts", type: "count",  icon: "User" },
        ],
    },
    {
        id: "gym", name: "Gym Trainer", description: "Form tracking, rep counting, injury prevention.", icon: "dumbbell",
        yolo: "yolo11n-pose.pt", fps: 2,
        instructions: "You are a strict, safety-focused gym trainer. Watch the user's video feed, tracking their body posture and form. Count reps verbally. Correct their form in real-time. VERY IMPORTANT: Use these EXACT key phrases: 'Reps: X' (count), 'Great form' or 'Form issue', 'Go deeper', 'Keep your chest up', 'Slow the descent', 'Watch your back'. Be highly observant and concise.",
        greeting: "Let's get to work! I'm your AI gym trainer. Stand back so I can see your full body, and tell me what exercise we are doing today.",
        stats_schema: [
            { key: "repCount",      label: "Reps",           type: "count", icon: "Repeat" },
            { key: "formScore",     label: "Form Score",     type: "score", icon: "TrendingUp" },
            { key: "formAlerts",    label: "Form Issues",    type: "count", icon: "AlertTriangle" },
            { key: "postureAlerts", label: "Posture Alerts", type: "count", icon: "User" },
        ],
    },
    {
        id: "speaking", name: "Public Speaking", description: "Body language, pacing & filler word analysis.", icon: "mic",
        yolo: "yolo11n-pose.pt", fps: 1,
        instructions: "You are an encouraging public speaking coach. Watch the user's video feed and listen to their speech. Focus on confidence, body language, and communication clarity. VERY IMPORTANT: Use these EXACT key phrases in your feedback: 'Great confidence' or 'Low confidence', 'Try planting your feet' (if swaying), 'Open your arms' (if closed), 'Filler words: X', 'Good pace' or 'Too fast'. Be concise.",
        greeting: "Hello! I am your public speaking coach. Whenever you are ready, start your presentation or speech.",
        stats_schema: [
            { key: "confidence",   label: "Confidence",    type: "score",  icon: "TrendingUp" },
            { key: "pace",         label: "Pace",          type: "status", icon: "Activity" },
            { key: "fillerWords",  label: "Filler Words",  type: "count",  icon: "Mic" },
            { key: "bodyLanguage", label: "Body Language", type: "status", icon: "User" },
        ],
    },
    {
        id: "chef", name: "Chef Coach", description: "Knife technique and kitchen safety.", icon: "chef-hat",
        yolo: "yolo11n-pose.pt", fps: 2,
        instructions: "You are a Michelin-star chef coach. Watch the user's hands and knife technique. VERY IMPORTANT: Use these EXACT key phrases: 'Safe grip' or 'Unsafe grip', 'Knife angle: X' (degrees), 'Good technique' or 'Technique issue', 'Slow down' (if too fast), 'Great control'. Monitor for dangerous hand positions. Be precise and safety-focused.",
        greeting: "Welcome to the kitchen! I'm your AI chef coach. Show me your ingredients and let's start cooking safely.",
        stats_schema: [
            { key: "safetyScore",     label: "Safety Score",    type: "score",  icon: "Shield" },
            { key: "techniqueAlerts", label: "Technique Issues", type: "count",  icon: "AlertTriangle" },
            { key: "gripStatus",      label: "Knife Grip",       type: "status", icon: "Tool" },
        ],
    },
    {
        id: "ergonomics", name: "Ergonomics", description: "Desk posture & workspace wellness.", icon: "monitor",
        yolo: "yolo11n-pose.pt", fps: 1,
        instructions: "You are a workplace ergonomics specialist. Monitor the user's posture at their desk in real-time. VERY IMPORTANT: Use these EXACT key phrases: 'Neck angle: X degrees' (forward tilt), 'Posture issue', 'Great posture', 'Adjust your monitor', 'Straighten your back', 'Wrist position issue'. Alert if bad posture persists over 2 minutes. Be calm and helpful.",
        greeting: "Hi! I'm your ergonomics coach. I'll silently monitor your posture and alert you when needed. Just keep working!",
        stats_schema: [
            { key: "postureScore",  label: "Posture Score",  type: "score",  icon: "TrendingUp" },
            { key: "neckAngle",     label: "Neck Angle",     type: "value",  unit: "°", icon: "Activity" },
            { key: "postureAlerts", label: "Posture Alerts", type: "count",  icon: "AlertTriangle" },
            { key: "wristStatus",   label: "Wrist Position", type: "status", icon: "Hand" },
        ],
    },
];

const DEFAULT_CUSTOM = {
    id: "custom_" + Math.random().toString(36).slice(2, 6),
    name: "", description: "", instructions: "", greeting: "",
    yolo: "yolo11n-pose.pt", fps: 1,
    stats_schema: [{ key: "confidence", label: "Confidence", type: "score", icon: "TrendingUp" }],
};

const IS = {
    width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 7, padding: "7px 10px", color: "#e2e8f0", fontSize: 12, outline: "none",
};
const LS = {
    fontSize: 10, color: "rgba(148,163,184,0.7)", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
};

const CSS = `
@keyframes vsBackdropIn  { from { opacity:0 } to { opacity:1 } }
@keyframes vsBackdropOut { from { opacity:1 } to { opacity:0 } }
@keyframes vsModalIn  {
    from { opacity:0; transform:translate(-50%,-48%) scale(0.93); }
    to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
}
@keyframes vsModalOut {
    from { opacity:1; transform:translate(-50%,-50%) scale(1); }
    to   { opacity:0; transform:translate(-50%,-48%) scale(0.93); }
}
select, option { background:#0f1623!important; color:#e2e8f0!important; }
select { color-scheme:dark; }
input::placeholder, textarea::placeholder { color:rgba(148,163,184,0.38)!important; }
`;

export default function LobbyScreen({ onJoin }) {
    const [selectedMode, setSelectedMode] = useState("interview");
    const [customModes, setCustomModes] = useState([]);
    const [modalState, setModalState] = useState("closed");
    const [editingCustom, setEditingCustom] = useState({ ...DEFAULT_CUSTOM });
    const [expandedMode, setExpandedMode] = useState(null);

    useEffect(() => {
        if (!document.getElementById('vs-css')) {
            const el = document.createElement('style');
            el.id = 'vs-css';
            el.textContent = CSS;
            document.head.appendChild(el);
        }
    }, []);

    useEffect(() => {
        document.body.style.overflow = modalState !== "closed" ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [modalState]);

    const openModal  = () => setModalState("open");
    const closeModal = () => {
        setModalState("closing");
        setTimeout(() => setModalState("closed"), 220);
    };

    const allModes = [...BUILTIN_MODES, ...customModes.map(m => ({ ...m, isCustom: true }))];
    const selectedModeConfig = allModes.find(m => m.id === selectedMode);

    const handleAddStat = () => setEditingCustom(p => ({
        ...p, stats_schema: [...p.stats_schema, { key: "stat_" + Date.now(), label: "New Stat", type: "count", icon: "Activity" }],
    }));
    const handleStatChange = (idx, field, value) => setEditingCustom(p => {
        const s = [...p.stats_schema];
        s[idx] = { ...s[idx], [field]: value };
        if (field === "label") s[idx].key = value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        return { ...p, stats_schema: s };
    });
    const handleRemoveStat = (idx) => setEditingCustom(p => ({
        ...p, stats_schema: p.stats_schema.filter((_, i) => i !== idx),
    }));
    const handleSaveCustom = () => {
        if (!editingCustom.name || !editingCustom.instructions) { alert("Name and Instructions required."); return; }
        const m = { ...editingCustom, id: "custom_" + editingCustom.name.toLowerCase().replace(/\s+/g, "_"), icon: "custom" };
        setCustomModes(p => [...p.filter(x => x.id !== m.id), m]);
        setSelectedMode(m.id);
        closeModal();
        setEditingCustom({ ...DEFAULT_CUSTOM, id: "custom_" + Math.random().toString(36).slice(2, 6) });
    };

    const handleJoin = () => onJoin(selectedMode, selectedModeConfig);

    const isClosing = modalState === "closing";
    const isVisible = modalState !== "closed";

    return (
        <>
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: "100dvh", width: "100%", padding: "10px 12px",
                background: "var(--bg,#0d1117)", overflowY: "auto",
            }}>
                <div style={{ width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 9 }}>

                    {/* Header */}
                    <div style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", background: "rgba(88,166,255,0.1)", padding: 10, borderRadius: "50%", marginBottom: 6 }}>
                            <Video size={28} color="#58a6ff" />
                        </div>
                        <h1 style={{ margin: 0, fontSize: "clamp(16px,4vw,22px)", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.02em" }}>
                            VisionStudio AI
                        </h1>
                        <p style={{ margin: "3px 0 0", fontSize: "clamp(10px,2.5vw,12px)", color: "#8b949e" }}>
                            Real-Time Universal Human Performance Engine
                        </p>
                    </div>

                    {/* Mode selector */}
                    <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 12px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <LayoutGrid size={13} color="#58a6ff" />
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>Select Agent Mode</span>
                            </div>
                            <button onClick={openModal} style={{
                                display: "flex", alignItems: "center", gap: 5,
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7,
                                color: "#58a6ff", fontSize: 11, fontWeight: 700, padding: "4px 9px", cursor: "pointer",
                            }}>
                                <Plus size={11} /> Custom
                            </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 6 }}>
                            {allModes.map(mode => {
                                const sel = selectedMode === mode.id;
                                const exp = expandedMode === mode.id;
                                return (
                                    <div key={mode.id} style={{
                                        borderRadius: 8, overflow: "hidden",
                                        border: `1px solid ${sel ? "#58a6ff" : "rgba(255,255,255,0.07)"}`,
                                        background: sel ? "rgba(88,166,255,0.09)" : "rgba(255,255,255,0.02)",
                                        transition: "all 0.15s",
                                    }}>
                                        <div onClick={() => setSelectedMode(mode.id)} style={{ padding: "9px 10px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 8 }}>
                                            <span style={{ fontSize: 17, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>{MODE_ICONS[mode.icon] || "⚡"}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 12, color: sel ? "#fff" : "#e2e8f0", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                                                    {mode.name}
                                                    {mode.isCustom && <span style={{ fontSize: 8, background: "rgba(88,166,255,0.3)", padding: "1px 4px", borderRadius: 3, color: "#58a6ff" }}>CUSTOM</span>}
                                                </div>
                                                <div style={{ fontSize: 10, color: "#8b949e", marginTop: 2, lineHeight: 1.35 }}>{mode.description}</div>
                                            </div>
                                            {mode.stats_schema?.length > 0 && (
                                                <button onClick={e => { e.stopPropagation(); setExpandedMode(exp ? null : mode.id); }}
                                                    style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", padding: 2, flexShrink: 0 }}>
                                                    {exp ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                </button>
                                            )}
                                        </div>
                                        {exp && mode.stats_schema?.length > 0 && (
                                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "6px 10px", display: "flex", flexWrap: "wrap", gap: 4 }}>
                                                {mode.stats_schema.map(s => (
                                                    <span key={s.key} style={{ fontSize: 9, padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: 4, color: "#8b949e" }}>{s.label}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mic / Camera */}
                    <div style={{ display: "flex", gap: 8 }}>
                        {[{ icon: <Mic size={12} />, label: "Microphone" }, { icon: <Video size={12} />, label: "Camera" }].map(({ icon, label }) => (
                            <div key={label} style={{
                                flex: 1, display: "flex", alignItems: "center", gap: 7,
                                background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
                                padding: "8px 11px", borderRadius: 8, color: "#8b949e", fontSize: 11,
                            }}>
                                {icon} {label} ready
                            </div>
                        ))}
                    </div>

                    {/* Start */}
                    <button onClick={handleJoin} style={{
                        width: "100%", padding: "13px", borderRadius: 10, border: "none",
                        background: "linear-gradient(135deg,#58a6ff 0%,#7c3aed 100%)",
                        color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        boxShadow: "0 4px 20px rgba(88,166,255,0.22)",
                    }}>
                        Start Session <ChevronRight size={17} />
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isVisible && (
                <>
                    <div onClick={closeModal} style={{
                        position: "fixed", inset: 0, zIndex: 100,
                        background: "rgba(6,10,18,0.6)",
                        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                        animation: `${isClosing ? "vsBackdropOut" : "vsBackdropIn"} 0.22s ease forwards`,
                    }} />
                    <div style={{
                        position: "fixed", top: "50%", left: "50%",
                        width: "min(520px, 92vw)", maxHeight: "85vh",
                        background: "rgba(13,17,26,0.82)",
                        backdropFilter: "blur(24px) saturate(1.4)", WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                        border: "1px solid rgba(88,166,255,0.18)",
                        borderRadius: 16, padding: 20, overflowY: "auto", zIndex: 101,
                        boxShadow: "0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
                        animation: `${isClosing ? "vsModalOut" : "vsModalIn"} 0.25s cubic-bezier(0.34,1.4,0.64,1) forwards`,
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Sliders size={15} color="#58a6ff" />
                                <span style={{ fontWeight: 800, fontSize: 15, color: "#e2e8f0" }}>Build Custom Mode</span>
                            </div>
                            <button onClick={closeModal} style={{
                                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 6, color: "#8b949e", cursor: "pointer", padding: "4px 6px", display: "flex",
                            }}>
                                <X size={14} />
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                            <input placeholder="Mode name (e.g. Yoga Coach)" value={editingCustom.name}
                                onChange={e => setEditingCustom(p => ({ ...p, name: e.target.value }))} style={IS} />
                            <input placeholder="Short description" value={editingCustom.description}
                                onChange={e => setEditingCustom(p => ({ ...p, description: e.target.value }))} style={IS} />
                            <textarea placeholder="Agent instructions — describe behavior and EXACT stat trigger phrases (e.g. 'Reps: 5')"
                                value={editingCustom.instructions}
                                onChange={e => setEditingCustom(p => ({ ...p, instructions: e.target.value }))}
                                rows={4} style={{ ...IS, resize: "vertical", fontFamily: "inherit" }} />
                            <input placeholder="Greeting message" value={editingCustom.greeting}
                                onChange={e => setEditingCustom(p => ({ ...p, greeting: e.target.value }))} style={IS} />
                        </div>

                        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                            <div style={{ flex: 3 }}>
                                <div style={LS}>Vision Model</div>
                                <select value={editingCustom.yolo}
                                    onChange={e => { const m = YOLO_MODELS.find(x => x.value === e.target.value); if (m?.available) setEditingCustom(p => ({ ...p, yolo: e.target.value })); }}
                                    style={IS}>
                                    {YOLO_MODELS.map(m => <option key={m.value} value={m.value} disabled={!m.available}>{m.label}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={LS}>FPS</div>
                                <select value={editingCustom.fps}
                                    onChange={e => setEditingCustom(p => ({ ...p, fps: parseInt(e.target.value) }))} style={IS}>
                                    {[1, 2, 3, 5].map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                                <div style={LS}>Dashboard Stats</div>
                                <button onClick={handleAddStat} style={{
                                    display: "flex", alignItems: "center", gap: 3,
                                    background: "rgba(88,166,255,0.1)", border: "1px solid rgba(88,166,255,0.2)",
                                    color: "#58a6ff", borderRadius: 5, fontSize: 11, padding: "3px 8px", cursor: "pointer",
                                }}>
                                    <Plus size={11} /> Add Stat
                                </button>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {editingCustom.stats_schema.map((stat, idx) => (
                                    <div key={idx} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                                        <input placeholder="Label" value={stat.label}
                                            onChange={e => handleStatChange(idx, "label", e.target.value)}
                                            style={{ ...IS, flex: 2, padding: "5px 8px" }} />
                                        <select value={stat.type} onChange={e => handleStatChange(idx, "type", e.target.value)}
                                            style={{ ...IS, flex: 2, padding: "5px 8px" }}>
                                            {STAT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        <select value={stat.icon} onChange={e => handleStatChange(idx, "icon", e.target.value)}
                                            style={{ ...IS, flex: 1.5, padding: "5px 8px" }}>
                                            {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                                        </select>
                                        <button onClick={() => handleRemoveStat(idx)}
                                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 3, flexShrink: 0 }}>
                                            <X size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ background: "rgba(250,200,0,0.06)", border: "1px solid rgba(250,200,0,0.15)", borderRadius: 7, padding: "6px 10px", marginBottom: 12, fontSize: 11, color: "rgba(250,200,0,0.75)", display: "flex", gap: 7, alignItems: "flex-start" }}>
                            <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                            Use exact stat label phrases as triggers in instructions. E.g. "Reps: 5" auto-updates rep count live.
                        </div>

                        <button onClick={handleSaveCustom} style={{
                            width: "100%", padding: "10px", borderRadius: 9, border: "none",
                            background: "linear-gradient(135deg,#58a6ff,#7c3aed)",
                            color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        }}>
                            <Zap size={14} /> Save & Select Mode
                        </button>
                    </div>
                </>
            )}
        </>
    );
}