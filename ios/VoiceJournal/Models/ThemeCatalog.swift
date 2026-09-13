import Foundation

/// Mirrors backend/classifier.js's THEMES list.
enum ThemeCatalog {
    static let all: [String] = [
        "Toastmasters", "Work", "Personal Growth", "Cooking", "Traveling",
        "Relationships", "Health", "Finance", "Hobbies", "Uncategorized",
    ]

    static let icon: [String: String] = [
        "Toastmasters": "megaphone.fill",
        "Work": "briefcase.fill",
        "Personal Growth": "leaf.fill",
        "Cooking": "fork.knife",
        "Traveling": "airplane",
        "Relationships": "heart.fill",
        "Health": "cross.case.fill",
        "Finance": "dollarsign.circle.fill",
        "Hobbies": "paintpalette.fill",
        "Uncategorized": "questionmark.circle",
    ]

    static func icon(for theme: String?) -> String {
        guard let theme, let icon = icon[theme] else { return "circle.dashed" }
        return icon
    }
}
