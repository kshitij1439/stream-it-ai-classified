import { useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

export default function QuestionCard() {
    const questions = [
        "Tell me about a time you faced a difficult technical challenge and how you overcame it.",
        "Explain the difference between React's useMemo and useCallback hooks.",
        "Where do you see your engineering career in 5 years?",
        "Describe a time you disagreed with a coworker. How did you handle it?"
    ];

    const [currentIndex, setCurrentIndex] = useState(0);

    const prev = () => setCurrentIndex(i => Math.max(0, i - 1));
    const next = () => setCurrentIndex(i => Math.min(questions.length - 1, i + 1));

    return (
        <div style={{
            background: 'rgba(22, 27, 34, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            padding: '20px',
            borderRadius: '12px',
            width: '600px',
            maxWidth: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--accent)' }}>
                <HelpCircle size={16} />
                <span style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Question</span>
            </div>

            <div style={{ fontSize: '18px', lineHeight: '1.5', minHeight: '60px', marginBottom: '20px' }}>
                {questions[currentIndex]}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Question {currentIndex + 1} of {questions.length}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={prev}
                        disabled={currentIndex === 0}
                        style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--text-main)' }}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={next}
                        disabled={currentIndex === questions.length - 1}
                        style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', color: currentIndex === questions.length - 1 ? 'var(--text-muted)' : 'var(--text-main)' }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
