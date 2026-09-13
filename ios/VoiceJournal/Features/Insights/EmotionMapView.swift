import SwiftUI

struct EmotionBubble: Identifiable {
    let emotion: String
    let count: Int
    let valence: Double
    let arousal: Double
    var id: String { emotion }
}

/// A hand-placed scatterplot — position = (valence, arousal), radius = count —
/// mirroring frontend/app.js's renderScatter(), drawn natively instead of as SVG.
struct EmotionMapView: View {
    let bubbles: [EmotionBubble]
    var onSelect: (String) -> Void

    private let pad: CGFloat = 44

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let cx = w / 2, cy = h / 2
            let scaleX = (w - pad * 2) / 2
            let scaleY = (h - pad * 2) / 2
            let maxCount = max(bubbles.map(\.count).max() ?? 1, 1)

            ZStack {
                Path { path in
                    path.move(to: CGPoint(x: pad, y: cy))
                    path.addLine(to: CGPoint(x: w - pad, y: cy))
                    path.move(to: CGPoint(x: cx, y: pad))
                    path.addLine(to: CGPoint(x: cx, y: h - pad))
                }
                .stroke(Color.journalPinkDark.opacity(0.25))

                axisLabel("pleasant", x: w - pad, y: cy - 12)
                axisLabel("unpleasant", x: pad, y: cy - 12)
                axisLabel("high energy", x: cx, y: pad - 10)
                axisLabel("low energy", x: cx, y: h - pad + 10)

                ForEach(bubbles) { bubble in
                    let radius = 18 + (Double(bubble.count) / Double(maxCount)) * 28
                    let x = cx + bubble.valence * scaleX
                    let y = cy - bubble.arousal * scaleY

                    Button {
                        onSelect(bubble.emotion)
                    } label: {
                        ZStack {
                            Circle().fill(EmotionCatalog.color(for: bubble.emotion).opacity(0.85))
                            VStack(spacing: 0) {
                                Text(EmotionCatalog.emoji(for: bubble.emotion) ?? "")
                                Text("\(bubble.count)").font(.system(size: 10, weight: .bold))
                            }
                            .foregroundStyle(.black.opacity(0.65))
                        }
                        .frame(width: radius * 2, height: radius * 2)
                    }
                    .buttonStyle(.plain)
                    .position(x: x, y: y)
                }
            }
        }
        .frame(height: 300)
    }

    private func axisLabel(_ text: String, x: CGFloat, y: CGFloat) -> some View {
        Text(text)
            .font(.caption2)
            .foregroundStyle(.secondary)
            .position(x: x, y: y)
    }
}
