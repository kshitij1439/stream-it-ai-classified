import { Activity, Eye, Mic, TrendingUp } from "lucide-react";

export default function StatsBar({ stats }) {
    // stats: { fillerWords: number, postureAlerts: number, eyeContact: string, pace: string, confidence: number }
    const {
        fillerWords = 0,
        postureAlerts = 0,
        eyeContact = "—",
        pace = "—",
        confidence = 100,
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

    const confidenceColor =
        confidence < 40 ? "var(--danger)" :
            confidence < 70 ? "var(--warning)" :
                "var(--success)";

    return (
        <div className="stats-overlay">
            <div className="stat-pill" style={{ flexDirection: 'column', alignItems: 'stretch', borderRadius: '12px', minWidth: '160px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TrendingUp size={16} color={confidenceColor} />
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>Confidence</span>
                    </div>
                    <span style={{ color: confidenceColor, fontWeight: 'bold', fontSize: '14px' }}>{confidence}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                        style={{
                            height: '100%',
                            width: `${confidence}%`,
                            backgroundColor: confidenceColor,
                            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease',
                            borderRadius: '4px'
                        }}
                    />
                </div>
            </div>

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
