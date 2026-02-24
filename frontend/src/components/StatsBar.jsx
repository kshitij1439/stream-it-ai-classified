import { Activity, Eye, Mic } from 'lucide-react';

export default function StatsBar() {
    return (
        <div className="stats-overlay">
            <div className="stat-pill">
                <Activity size={16} color="var(--success)" />
                <span>Pace: Good</span>
            </div>
            <div className="stat-pill">
                <Eye size={16} color="var(--accent)" />
                <span>Eye Contact: 85%</span>
            </div>
            <div className="stat-pill">
                <Mic size={16} color="var(--warning)" />
                <span>Filler Words: 3</span>
            </div>
        </div>
    );
}
