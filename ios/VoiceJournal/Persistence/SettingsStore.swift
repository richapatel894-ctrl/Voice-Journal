import Foundation
import Combine

@MainActor
final class SettingsStore: ObservableObject {
    static let shared = SettingsStore()

    @Published var serverURLString: String {
        didSet { UserDefaults.standard.set(serverURLString, forKey: Keys.serverURL) }
    }
    @Published var apiKey: String {
        didSet { KeychainHelper.set(apiKey, for: Keys.apiKey) }
    }
    @Published var reminderEnabled: Bool {
        didSet { UserDefaults.standard.set(reminderEnabled, forKey: Keys.reminderEnabled) }
    }
    @Published var reminderTime: Date {
        didSet { UserDefaults.standard.set(reminderTime, forKey: Keys.reminderTime) }
    }
    @Published var reminderWeekdays: Set<Int> {
        didSet { UserDefaults.standard.set(Array(reminderWeekdays), forKey: Keys.reminderWeekdays) }
    }

    private enum Keys {
        static let serverURL = "serverURLString"
        static let apiKey = "journalAPIKey"
        static let reminderEnabled = "reminderEnabled"
        static let reminderTime = "reminderTime"
        static let reminderWeekdays = "reminderWeekdays"
    }

    private init() {
        serverURLString = UserDefaults.standard.string(forKey: Keys.serverURL) ?? ""
        apiKey = KeychainHelper.get(Keys.apiKey) ?? ""
        reminderEnabled = UserDefaults.standard.bool(forKey: Keys.reminderEnabled)
        reminderTime = UserDefaults.standard.object(forKey: Keys.reminderTime) as? Date
            ?? Calendar.current.date(bySettingHour: 20, minute: 0, second: 0, of: Date())
            ?? Date()
        if let saved = UserDefaults.standard.array(forKey: Keys.reminderWeekdays) as? [Int] {
            reminderWeekdays = Set(saved)
        } else {
            reminderWeekdays = Set(1...7) // every day by default
        }
    }

    /// nil when no server has been configured yet, or the string doesn't
    /// parse into a usable URL.
    var serverURL: URL? {
        let trimmed = serverURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let withScheme = trimmed.hasPrefix("http") ? trimmed : "http://\(trimmed)"
        return URL(string: withScheme)
    }

    var isConfigured: Bool { serverURL != nil }
}
