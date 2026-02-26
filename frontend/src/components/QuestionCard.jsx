import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, GripHorizontal } from 'lucide-react';

const QUESTIONS = [
    "Tell me about a time you faced a difficult technical challenge and how you overcame it.",
    "Explain the difference between React's useMemo and useCallback hooks.",
    "Where do you see your engineering career in 5 years?",
    "Describe a time you disagreed with a coworker. How did you handle it?",
    "Walk me through how you'd design a scalable REST API.",
    "What's your approach to debugging a production issue under pressure?",
];

export default function QuestionCard() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pos, setPos] = useState({ x: 0, y: 0 }); // offset from initial center
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef(null); // { mouseX, mouseY, posX, posY }
    const cardRef = useRef(null);

    const prev = () => setCurrentIndex(i => Math.max(0, i - 1));
    const next = () => setCurrentIndex(i => Math.min(QUESTIONS.length - 1, i + 1));

    // ── Drag handlers ──────────────────────────────────────────────────────────
    const onMouseDown = useCallback((e) => {
        // Only drag from the handle bar, not from buttons
        if (e.target.closest('button')) return;
        e.preventDefault();
        setDragging(true);
        dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y };
    }, [pos]);

    useEffect(() => {
        if (!dragging) return;

        const onMouseMove = (e) => {
            const dx = e.clientX - dragStart.current.mouseX;
            const dy = e.clientY - dragStart.current.mouseY;
            setPos({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
        };

        const onMouseUp = () => setDragging(false);

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [dragging]);

    // ── Touch support ──────────────────────────────────────────────────────────
    const onTouchStart = useCallback((e) => {
        if (e.target.closest('button')) return;
        const t = e.touches[0];
        setDragging(true);
        dragStart.current = { mouseX: t.clientX, mouseY: t.clientY, posX: pos.x, posY: pos.y };
    }, [pos]);

    useEffect(() => {
        if (!dragging) return;

        const onTouchMove = (e) => {
            const t = e.touches[0];
            const dx = t.clientX - dragStart.current.mouseX;
            const dy = t.clientY - dragStart.current.mouseY;
            setPos({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
        };
        const onTouchEnd = () => setDragging(false);

        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd);
        return () => {
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [dragging]);

    const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;

    return (
        <div
            ref={cardRef}
            style={{
                position: 'absolute',
                top: `calc(40px + ${pos.y}px)`,
                left: `calc(50% + ${pos.x}px)`,
                transform: 'translateX(-50%)',
                zIndex: 10,
                userSelect: 'none',
                cursor: dragging ? 'grabbing' : 'default',
                width: 600,
                maxWidth: '90vw',
                // smooth drop shadow when dragging
                filter: dragging
                    ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.7))'
                    : 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
                transition: dragging ? 'none' : 'filter 0.2s ease',
            }}
        >
            <div style={{
                background: 'rgba(22, 27, 34, 0.92)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${dragging ? 'rgba(88,166,255,0.4)' : 'var(--border)'}`,
                borderRadius: 12,
                overflow: 'hidden',
                transition: 'border-color 0.2s ease',
            }}>
                {/* ── Drag handle ────────────────────────────────────────────── */}
                <div
                    onMouseDown={onMouseDown}
                    onTouchStart={onTouchStart}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px 8px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        cursor: dragging ? 'grabbing' : 'grab',
                        background: 'rgba(255,255,255,0.02)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
                        <HelpCircle size={14} />
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Current Question
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 11 }}>
                        <span>{currentIndex + 1} / {QUESTIONS.length}</span>
                        <GripHorizontal size={14} style={{ opacity: 0.5 }} />
                    </div>
                </div>

                {/* ── Progress bar ───────────────────────────────────────────── */}
                <div style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: 'var(--accent)',
                        transition: 'width 0.3s ease',
                    }} />
                </div>

                {/* ── Question text ──────────────────────────────────────────── */}
                <div style={{ padding: '16px 20px 12px' }}>
                    <div style={{
                        fontSize: 17,
                        lineHeight: 1.55,
                        minHeight: 56,
                        color: 'var(--text-main)',
                        transition: 'opacity 0.15s ease',
                    }}>
                        {QUESTIONS[currentIndex]}
                    </div>
                </div>

                {/* ── Navigation ─────────────────────────────────────────────── */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 20px 16px',
                    gap: 8,
                }}>
                    <button
                        onClick={prev}
                        disabled={currentIndex === 0}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px',
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--text-main)',
                            fontSize: 13,
                            opacity: currentIndex === 0 ? 0.4 : 1,
                            transition: 'opacity 0.2s, background 0.2s',
                        }}
                    >
                        <ChevronLeft size={15} /> Prev
                    </button>

                    {/* dot indicators */}
                    <div style={{ display: 'flex', gap: 5 }}>
                        {QUESTIONS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                style={{
                                    width: i === currentIndex ? 18 : 6,
                                    height: 6,
                                    borderRadius: 3,
                                    background: i === currentIndex ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    padding: 0,
                                    transition: 'width 0.25s ease, background 0.2s ease',
                                    cursor: 'pointer',
                                }}
                            />
                        ))}
                    </div>

                    <button
                        onClick={next}
                        disabled={currentIndex === QUESTIONS.length - 1}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px',
                            background: currentIndex === QUESTIONS.length - 1
                                ? 'rgba(255,255,255,0.07)'
                                : 'rgba(88,166,255,0.15)',
                            border: `1px solid ${currentIndex === QUESTIONS.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(88,166,255,0.3)'}`,
                            borderRadius: 6,
                            color: currentIndex === QUESTIONS.length - 1 ? 'var(--text-muted)' : 'var(--accent)',
                            fontSize: 13,
                            opacity: currentIndex === QUESTIONS.length - 1 ? 0.4 : 1,
                            transition: 'opacity 0.2s, background 0.2s',
                        }}
                    >
                        Next <ChevronRight size={15} />
                    </button>
                </div>
            </div>
        </div>
    );
}