import Foundation

/// The requirements doc's "actionable layer" (what → why → how) for
/// Insights. Templated per-emotion for v1, matching this project's own
/// stated philosophy: start dumb and inspectable, add a real model once
/// there's data to justify it (TECH_DESIGN.md §4).
struct EmotionGuidance {
    let what: String
    let why: String
    let how: String
}

enum EmotionGuidanceCatalog {
    static let guidance: [String: EmotionGuidance] = [
        "Happy": EmotionGuidance(
            what: "Happy shows up often in this window.",
            why: "Usually tracks with progress on something that matters to you, or good time with people you like.",
            how: "Write down what specifically led to it — it's the fastest way to find more of it on purpose."
        ),
        "Excited": EmotionGuidance(
            what: "Excited entries stood out this period.",
            why: "Often tied to something new starting, or a plan coming together.",
            how: "Capture the plan while the energy's high — future-you will want the details, not just the feeling."
        ),
        "Grateful": EmotionGuidance(
            what: "Gratitude showed up repeatedly.",
            why: "Tends to follow noticing something good rather than taking it for granted.",
            how: "Consider telling the person or naming the thing directly — gratitude shared tends to compound."
        ),
        "Calm": EmotionGuidance(
            what: "Calm was a recurring note this period.",
            why: "Often follows rest, or clearing something off your plate.",
            how: "Notice what made room for it, and protect that thing on purpose."
        ),
        "Confused": EmotionGuidance(
            what: "Confused entries came up this period.",
            why: "Usually means a decision or situation has more unknowns than you'd like.",
            how: "Write the specific question you can't answer — naming it precisely is most of the way to resolving it."
        ),
        "Anxious": EmotionGuidance(
            what: "Anxious was a common thread this period.",
            why: "Often shows up around deadlines, uncertainty, or too much on your plate at once.",
            how: "Name the one thing you can actually control today, and set a time limit on worrying about the rest."
        ),
        "Angry": EmotionGuidance(
            what: "Angry entries appeared this period.",
            why: "Usually points at a boundary that got crossed, or something that felt unfair.",
            how: "Name the boundary explicitly — anger is often useful information about what needs to change."
        ),
        "Sad": EmotionGuidance(
            what: "Sad showed up more than once this period.",
            why: "Often follows a loss, disappointment, or missing someone/something.",
            how: "Let it be there without rushing to fix it — and reach out to someone if it's sticking around."
        ),
        "Disappointed": EmotionGuidance(
            what: "Disappointed entries came up this period.",
            why: "Usually means reality fell short of an expectation you were holding.",
            how: "Check whether the expectation was realistic — sometimes the fix is the plan, not the outcome."
        ),
        "Tired": EmotionGuidance(
            what: "Tired was a recurring note this period.",
            why: "Often a straightforward signal about sleep, pace, or too many things at once.",
            how: "Treat this one literally — the fix is usually rest, not motivation."
        ),
    ]
}
