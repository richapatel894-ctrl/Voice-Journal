import SwiftUI

/// Mirrors backend/classifier.js's EMOTION_COORDS and the emoji/color mapping
/// already established in frontend/app.js, so the iOS app reads consistently
/// with the web prototype.
enum EmotionCatalog {
    static let all: [String] = [
        "Happy", "Excited", "Grateful", "Calm", "Confused",
        "Anxious", "Angry", "Sad", "Disappointed", "Tired",
    ]

    static let emoji: [String: String] = [
        "Happy": "😊", "Excited": "🤩", "Grateful": "🙏", "Calm": "😌",
        "Confused": "😕", "Anxious": "😰", "Angry": "😠", "Sad": "😢",
        "Disappointed": "😞", "Tired": "😴", "Content": "😌",
    ]

    static let color: [String: Color] = [
        "Happy": Color(hex: 0xFFD98A), "Excited": Color(hex: 0xFFB877),
        "Grateful": Color(hex: 0xB8E6B0), "Calm": Color(hex: 0xA8E6CF),
        "Content": Color(hex: 0xA8E6CF), "Confused": Color(hex: 0xFFC9A4),
        "Anxious": Color(hex: 0xD6C2FF), "Angry": Color(hex: 0xFFB3B3),
        "Sad": Color(hex: 0xA9C8FF), "Disappointed": Color(hex: 0xE6D5C3),
        "Tired": Color(hex: 0xC9CDD6),
    ]

    /// (valence, arousal) mood-map coordinates, mirroring EMOTION_COORDS.
    static let coords: [String: (valence: Double, arousal: Double)] = [
        "Happy": (0.8, 0.5), "Excited": (0.7, 0.9), "Grateful": (0.7, -0.1),
        "Calm": (0.5, -0.4), "Content": (0.5, -0.4), "Confused": (-0.1, 0.25),
        "Anxious": (-0.5, 0.7), "Angry": (-0.6, 0.8), "Sad": (-0.7, -0.3),
        "Disappointed": (-0.4, -0.2), "Tired": (-0.2, -0.7),
    ]

    static func emoji(for emotion: String?) -> String? {
        guard let emotion, !emotion.isEmpty else { return nil }
        return emoji[emotion]
    }

    static func color(for emotion: String?) -> Color {
        guard let emotion, let c = color[emotion] else { return .gray }
        return c
    }
}

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
