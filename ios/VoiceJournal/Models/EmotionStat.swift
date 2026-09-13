import Foundation

struct EmotionStat: Codable, Identifiable {
    var id: String { emotion }
    let emotion: String
    let count: Int
    let valence: Double
    let arousal: Double
}
