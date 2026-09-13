import Foundation

struct EmotionScores: Codable, Hashable {
    let valence: Double
    let arousal: Double
}

enum EntryKind: String, Codable {
    case voice
    case text
}

struct Entry: Codable, Identifiable, Hashable {
    let id: String
    var kind: String
    let createdAt: String
    var text: String
    var theme: String?
    var themeConfidence: Double?
    var emotion: String?
    var emotionScores: EmotionScores?
    var media: [String]
    var userConfirmed: Bool

    /// Empty-string emotion (the backend's "no confident match" value) is
    /// treated the same as no emotion everywhere in the UI.
    var displayEmotion: String? {
        guard let emotion, !emotion.isEmpty else { return nil }
        return emotion
    }

    var createdDate: Date {
        Entry.isoFormatter.date(from: createdAt)
            ?? Entry.isoFormatterNoFraction.date(from: createdAt)
            ?? Date()
    }

    static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static let isoFormatterNoFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
}
