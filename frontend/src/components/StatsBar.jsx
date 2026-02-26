import { Activity, Eye, Mic } from "lucide-react";

export default function StatsBar({ stats }) {
    // stats: { fillerWords: number, postureAlerts: number, eyeContact: string, pace: string }
    const {
        fillerWords = 0,
        postureAlerts = 0,
        eyeContact = "—",
        pace = "—",
    } = stats || {};

    const fillerColor =
        fillerWords > 5
            ? "var(--danger)"
            : fillerWords > 2
                ? "var(--warning)"
                : "var(--success)";
    const postureColor =
        postureAlerts > 3
            ? "var(--danger)"
            : postureAlerts > 1
                ? "var(--warning)"
                : "var(--success)";

    return (
        <div className="stats-overlay">
            <div className="stat-pill">
                <Activity size={16} color="var(--success)" />
                <span>Pace: {pace}</span>
            </div>
            <div className="stat-pill">
                <Eye size={16} color="var(--accent)" />
                <span>Eye Contact: {eyeContact}</span>
            </div>
            <div className="stat-pill" style={{ color: fillerColor }}>
                <Mic size={16} color={fillerColor} />
                <span>Fillers: {fillerWords}</span>
            </div>
            {postureAlerts > 0 && (
                <div className="stat-pill" style={{ color: postureColor }}>
                    <span>🧍 Posture alerts: {postureAlerts}</span>
                </div>
            )}
        </div>
    );
}
