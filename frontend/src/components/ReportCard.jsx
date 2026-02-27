import { Download, ChevronLeft, Star, Mic, Eye, Activity } from 'lucide-react';

export default function ReportCard({ reportData, jobRole, onBackToLobby }) {
    const { stats, messages } = reportData;

    const handleDownload = () => {
        window.print();
    };

    return (
        <div className="lobby-container" style={{ padding: '20px', overflowY: 'auto' }}>
            <div className="lobby-card report-card-print" style={{ maxWidth: '600px', width: '100%', textAlign: 'left', margin: '40px auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h1 className="lobby-title print-text" style={{ margin: 0 }}>
                        {jobRole === 'gym' ? 'Workout Report' : jobRole === 'speaking' ? 'Speaking Report' : 'Interview Report'}
                    </h1>
                    <button
                        onClick={handleDownload}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid var(--border)' }}
                        className="hide-on-print"
                    >
                        <Download size={16} /> Print / Save PDF
                    </button>
                </div>

                <p className="print-text" style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Mode: <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{jobRole}</strong></p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '32px' }}>

                    {jobRole === 'gym' ? (
                        <>
                            <div className="print-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div className="print-text" style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={16} color="var(--accent)" /> Form Score</div>
                                <div className="print-text" style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.confidence}%</div>
                            </div>
                            <div className="print-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div className="print-text" style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={16} /> Form Corrections</div>
                                <div className="print-text" style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.formAlerts}</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="print-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div className="print-text" style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={16} color="var(--accent)" /> Overall Confidence</div>
                                <div className="print-text" style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.confidence}%</div>
                            </div>
                            <div className="print-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div className="print-text" style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Mic size={16} /> Filler Words</div>
                                <div className="print-text" style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.fillerWords}</div>
                            </div>
                        </>
                    )}

                    {jobRole === 'interview' && (
                        <div className="print-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div className="print-text" style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Eye size={16} /> Eye Contact</div>
                            <div className="print-text" style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: '38px' }}>{stats.eyeContact}</div>
                        </div>
                    )}

                    <div className="print-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div className="print-text" style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={16} /> Posture Alerts</div>
                        <div className="print-text" style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.postureAlerts}</div>
                    </div>
                </div>

                <h3 className="print-text" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Detailed Feedback</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    {messages.length === 0 ? (
                        <p className="print-text" style={{ color: 'var(--text-muted)' }}>No feedback collected during this session.</p>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className="print-box" style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid var(--accent)' }}>
                                <div className="print-text" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                                <div className="print-text" style={{ color: 'var(--text-main)', fontSize: '14px', lineHeight: 1.5 }}>{msg.message}</div>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '40px' }} className="hide-on-print">
                    <button
                        onClick={onBackToLobby}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 auto' }}
                    >
                        <ChevronLeft size={16} /> Back to Lobby
                    </button>
                </div>
            </div>
            <style>{`
                @media print {
                    body { background-color: #fff !important; margin: 0; padding: 0; }
                    .hide-on-print { display: none !important; }
                    .lobby-container { background: #fff !important; display: block !important; padding: 0 !important; margin: 0 !important; }
                    .report-card-print { 
                        box-shadow: none !important; 
                        border: none !important; 
                        margin: 0 !important; 
                        max-width: 100% !important; 
                        padding: 20px !important; 
                        background: #fff !important;
                    }
                    .print-text { color: #000 !important; text-shadow: none !important; }
                    .print-box { 
                        background: #f8f9fa !important; 
                        border-color: #ddd !important; 
                        color: #000 !important; 
                    }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>
        </div>
    );
}
