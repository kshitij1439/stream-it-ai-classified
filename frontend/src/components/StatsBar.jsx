import { Activity, Eye, Mic, TrendingUp, User, AlertTriangle, Shield, Repeat, Star, Zap } from "lucide-react";

const ICON_MAP = {
    TrendingUp, Activity, Eye, Mic, User, AlertTriangle, Shield, Repeat, Star, Zap,
    Tool: Activity, // fallback
    Hand: User,     // fallback
};

function StatIcon({ name, size = 15, color }) {
    const Comp = ICON_MAP[name] || Activity;
    return <Comp size={size} color={color} />;
}

function getStatusColor(value) {
    if (!value || value === "—") return "var(--text-muted)";
    const v = String(value).toLowerCase();
    if (v.includes("great") || v.includes("good") || v.includes("safe") || v.includes("✓")) return "var(--success, #22c55e)";
    if (v.includes("issue") || v.includes("needs") || v.includes("fast") || v.includes("unsafe")) return "var(--warning, #f59e0b)";
    return "var(--text-main)";
}

function getCountColor(value, thresholds = [2, 5]) {
    if (value <= thresholds[0]) return "var(--success, #22c55e)";
    if (value <= thresholds[1]) return "var(--warning, #f59e0b)";
    return "var(--danger, #ef4444)";
}

function getScoreColor(value) {
    if (value >= 70) return "var(--success, #22c55e)";
    if (value >= 40) return "var(--warning, #f59e0b)";
    return "var(--danger, #ef4444)";
}

// ── Score pill (with progress bar) ───────────────────────────────────────────
function ScoreStat({ stat, value }) {
    const color = getScoreColor(value);
    return (
        <div className="stat-pill" style={{ flexDirection: 'column', alignItems: 'stretch', minWidth: 150, padding: '10px 14px', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatIcon name={stat.icon} size={14} color={color} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{stat.label}</span>
                </div>
                <span style={{ color, fontWeight: 700, fontSize: 13 }}>{value}%</span>
            </div>
            <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${value}%`,
                    background: color,
                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1), background-color 0.4s ease',
                    borderRadius: 4,
                }} />
            </div>
        </div>
    );
}

// ── Count pill ────────────────────────────────────────────────────────────────
function CountStat({ stat, value }) {
    const color = getCountColor(value);
    return (
        <div className="stat-pill" style={{ color }}>
            <StatIcon name={stat.icon} size={15} color={color} />
            <span>{stat.label}: {value}</span>
        </div>
    );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusStat({ stat, value }) {
    const display = value || "—";
    const color = getStatusColor(display);
    return (
        <div className="stat-pill">
            <StatIcon name={stat.icon} size={15} color={color} />
            <span>{stat.label}: <span style={{ color, fontWeight: 600 }}>{display}</span></span>
        </div>
    );
}

// ── Value pill (numeric + unit) ───────────────────────────────────────────────
function ValueStat({ stat, value }) {
    return (
        <div className="stat-pill">
            <StatIcon name={stat.icon} size={15} color="var(--accent)" />
            <span>{stat.label}: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{value ?? "—"}{stat.unit || ""}</span></span>
        </div>
    );
}

// ── Main StatsBar ─────────────────────────────────────────────────────────────
export default function StatsBar({ stats = {}, statsSchema = [] }) {
    // Fallback schema if none provided
    const schema = statsSchema.length > 0 ? statsSchema : [
        { key: "confidence", label: "Confidence", type: "score", icon: "TrendingUp" },
        { key: "eyeContact", label: "Eye Contact", type: "status", icon: "Eye" },
        { key: "pace", label: "Pace", type: "status", icon: "Activity" },
        { key: "fillerWords", label: "Fillers", type: "count", icon: "Mic" },
    ];

    return (
        <div className="stats-overlay">
            {schema.map(stat => {
                const value = stats[stat.key];
                switch (stat.type) {
                    case "score":
                        return <ScoreStat key={stat.key} stat={stat} value={typeof value === "number" ? value : 100} />;
                    case "count":
                        return <CountStat key={stat.key} stat={stat} value={typeof value === "number" ? value : 0} />;
                    case "status":
                        return <StatusStat key={stat.key} stat={stat} value={value ?? "—"} />;
                    case "value":
                        return <ValueStat key={stat.key} stat={stat} value={value} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
}