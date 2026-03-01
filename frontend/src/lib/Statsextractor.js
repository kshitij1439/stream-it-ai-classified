/**
 * extractStats — universal stats extractor
 * Works with any stats_schema. Parses agent speech text to populate stats.
 *
 * Schema stat types:
 *  - "score"  → 0–100 number, computed from positive/negative signals
 *  - "count"  → integer, parsed from speech like "Reps: 5" or "Filler words: 3"
 *  - "status" → string, parsed from known status phrases
 *  - "value"  → numeric with unit, parsed from "Neck angle: 25 degrees"
 */

// ── Universal patterns ────────────────────────────────────────────────────────

const COUNT_PATTERNS = [
    // "Filler words: 3", "Reps: 10", "Rep count: 5"
    (text, label) => {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const m = text.match(new RegExp(`${escaped}[:\\s-]+([\\d]+)`, 'i'));
        if (m) return parseInt(m[1], 10);
        // reverse: "3 filler words"
        const m2 = text.match(new RegExp(`([\\d]+)\\s+${escaped}`, 'i'));
        if (m2) return parseInt(m2[1], 10);
        return null;
    },
    // Generic "Filler: X" abbreviated
    (text, label) => {
        const word = label.split(' ')[0];
        const m = text.match(new RegExp(`${word}[:\\s]+([\\d]+)`, 'i'));
        return m ? parseInt(m[1], 10) : null;
    },
];

const VALUE_PATTERNS = [
    (text, label) => {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const m = text.match(new RegExp(`${escaped}[:\\s]+([\\d.]+)`, 'i'));
        return m ? parseFloat(m[1]) : null;
    },
];

// Status keyword maps per label keyword
const STATUS_KEYWORDS = {
    "eye contact": [
        { phrases: ["great eye contact", "good eye contact", "excellent eye contact", "maintain eye contact"], value: "Great ✓" },
        { phrases: ["needs eye contact", "eye contact issue", "look at the camera", "avoid looking away"], value: "Needs work" },
    ],
    "pace": [
        { phrases: ["good pace", "great pace", "perfect pace"], value: "Good ✓" },
        { phrases: ["too fast", "slow down", "speed issue", "speaking too quickly"], value: "Too fast" },
        { phrases: ["too slow", "pick up the pace", "speak faster"], value: "Too slow" },
    ],
    "body language": [
        { phrases: ["open your arms", "closed body language", "try planting your feet", "sway"], value: "Needs work" },
        { phrases: ["great body language", "good posture", "confident stance"], value: "Good ✓" },
    ],
    "grip": [
        { phrases: ["safe grip", "good grip", "correct grip"], value: "Safe ✓" },
        { phrases: ["unsafe grip", "dangerous grip", "fix your grip"], value: "Unsafe!" },
    ],
    "wrist": [
        { phrases: ["wrist position issue", "drop your wrists", "lift your wrists"], value: "Needs work" },
        { phrases: ["good wrist position", "wrist ok"], value: "Good ✓" },
    ],
    "confidence": [
        { phrases: ["great confidence", "high confidence", "confident"], value: "High" },
        { phrases: ["low confidence", "lacks confidence", "appear more confident"], value: "Low" },
    ],
};

function matchStatus(fullText, labelKey) {
    const key = labelKey.toLowerCase();
    // Find the best matching keyword group
    for (const [group, entries] of Object.entries(STATUS_KEYWORDS)) {
        if (key.includes(group) || group.includes(key)) {
            for (const entry of entries) {
                if (entry.phrases.some(p => fullText.includes(p))) {
                    return entry.value;
                }
            }
        }
    }
    return null;
}

// ── Score signals (positive/negative phrase impacts) ─────────────────────────
const SCORE_SIGNALS = [
    // positive
    { phrases: ["great form", "good form", "excellent form", "perfect form"], delta: +8 },
    { phrases: ["great eye contact", "good eye contact"], delta: +5 },
    { phrases: ["good pace", "great pace"], delta: +5 },
    { phrases: ["great confidence", "high confidence"], delta: +8 },
    { phrases: ["safe grip", "good technique", "great technique"], delta: +6 },
    { phrases: ["great posture", "good posture"], delta: +5 },
    // negative
    { phrases: ["posture issue", "slouch", "sit up straighter", "watch your back"], delta: -5 },
    { phrases: ["form issue", "go deeper", "keep your chest up", "slow the descent"], delta: -5 },
    { phrases: ["needs eye contact", "eye contact issue"], delta: -8 },
    { phrases: ["too fast", "slow down"], delta: -4 },
    { phrases: ["filler word", "um", "uh", "like,"], delta: -2 },
    { phrases: ["unsafe grip", "dangerous grip"], delta: -10 },
    { phrases: ["low confidence", "lacks confidence"], delta: -8 },
    { phrases: ["technique issue", "adjust your monitor"], delta: -4 },
];

// ── Main extractor ────────────────────────────────────────────────────────────
export function extractStats(messages, statsSchema) {
    const fullText = messages.map(m => m.message || "").join(" ").toLowerCase();

    // Start with defaults
    const stats = {};
    for (const stat of statsSchema) {
        switch (stat.type) {
            case "score": stats[stat.key] = 100; break;
            case "count": stats[stat.key] = 0; break;
            case "status": stats[stat.key] = "—"; break;
            case "value": stats[stat.key] = null; break;
        }
    }

    for (const stat of statsSchema) {
        const label = stat.label.toLowerCase();

        if (stat.type === "count") {
            let found = null;
            for (const pattern of COUNT_PATTERNS) {
                found = pattern(fullText, stat.label);
                if (found !== null) break;
            }
            if (found !== null) stats[stat.key] = found;
            else {
                // Count raw occurrences of the label word
                const wordMatch = fullText.match(new RegExp(stat.label.split(' ')[0].toLowerCase(), 'g'));
                if (wordMatch) stats[stat.key] = wordMatch.length;
            }
        }

        if (stat.type === "status") {
            const matched = matchStatus(fullText, label);
            if (matched) stats[stat.key] = matched;
        }

        if (stat.type === "value") {
            for (const pattern of VALUE_PATTERNS) {
                const found = pattern(fullText, stat.label);
                if (found !== null) { stats[stat.key] = found; break; }
            }
        }

        if (stat.type === "score") {
            // Compute score from signals
            let score = 100;
            for (const signal of SCORE_SIGNALS) {
                const count = signal.phrases.filter(p => fullText.includes(p)).length;
                if (count > 0) score += signal.delta * count;
            }
            // Penalize counts
            for (const other of statsSchema) {
                if (other.type === "count" && typeof stats[other.key] === "number") {
                    score -= stats[other.key] * 2;
                }
            }
            stats[stat.key] = Math.max(0, Math.min(100, Math.round(score)));
        }
    }

    return stats;
}

/**
 * Gets the stats_schema from a coaching_feedback event if available,
 * or falls back to the provided default schema.
 */
export function getSchemaFromEvent(event, defaultSchema) {
    return event?.custom?.stats_schema || event?.stats_schema || defaultSchema;
}